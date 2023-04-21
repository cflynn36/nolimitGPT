require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const { Configuration, OpenAIApi } = require("openai");



const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ email });
      await user.save();
    }

    return done(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Rest of the code remains unchanged

const UserSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  credits: { type: Number, default: 0 },
  email: { type: String },
  subscribed: { type: Boolean, default: false },
  subscriptionId: { type: String, default: null }, // Add this line
});

const User = mongoose.model('User', UserSchema);

// Middleware for authentication
const authenticate = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/auth/google');
  }
};
async function updateUserCredits(userId, creditsChange) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.credits += creditsChange;
  await user.save();
  return user;
}
async function GPT4(message) {
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  return response.data.choices[0].message.content;
}

// Routes
app.post('/chat', authenticate, async (req, res) => {
  const message = req.body.message;

  // Check if the user has enough credits
  if (req.user.credits < 1) {
    return res.status(400).send({ error: "Insufficient credits" });
  }

  try {
    const gpt4Response = await GPT4(message);
    
    // Deduct a credit from the user and get the updated user object
    const updatedUser = await updateUserCredits(req.user._id, -1);

    // Send the response with the message and the updated credits
    res.send({ reply: gpt4Response, credits: updatedUser.credits });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});
app.get('/chat', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.render('chat', { user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

app.get('/image-generator', authenticate, (req, res) => {
  res.render('image-generator', { user: req.user });
});


app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).send('User not found');
    } else {
      res.render('dashboard', { user });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

app.post('/create-checkout-session', authenticate, async (req, res) => {
  const { priceId } = req.body;
  const user = req.user;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: 'https://example.com/success',
    cancel_url: 'https://example.com/failure',
    client_reference_id: user._id,
  });

  res.json(session);
});
app.post('/cancel-subscription', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).send('User not found');
    } else {
      // Cancel the subscription in Stripe
      await stripe.subscriptions.del(user.subscriptionId);

      // Update the user's subscription status
      user.subscribed = false;
      user.subscriptionId = null;
      await user.save();

      res.sendStatus(200);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});
// Update the /image endpoint
app.post("/image", authenticate, async (req, res) => {
  // Check if the user has enough credits
  if (req.user.credits < 1) {
    return res.status(400).send({ error: "Insufficient credits" });
  }

  // Get the prompt from the request
  const { prompt } = req.body;

  // Generate image from prompt with a smaller size
  const response = await openai.createImage({
    prompt: prompt,
    n: 1,
    size: "256x256", // or "256x256" if you want a slightly larger image
  });

  try {
    // Update the user's credit count (subtract one credit)
    await updateUserCredits(req.user._id, -1);
    // Send back image URL
    res.send(response.data.data[0].url);
  } catch (err) {
    res.status(500).send({ error: "Failed to update user credits" });
  }
});
app.post('/webhook', async (req, res) => {
  const event = req.body;

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const user = await User.findById(userId);

      // Retrieve the subscription from Stripe
      const subscriptionId = session.subscription;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Get the price ID from the subscription object
      const priceId = subscription.items.data[0].price.id;

      // Increment credits based on the price ID
      let creditsToAdd;
      if (priceId === 'price_1MyxufE98euyK5qLAy68RyR8') {
        creditsToAdd = 150;
      } else if (priceId === 'price_1Myxv1E98euyK5qLlpy6rgv4') {
        creditsToAdd = 500;
      } else if (priceId === 'price_1MyxttE98euyK5qLy7q0aXcC'){
        creditsToAdd = 10;
      } else {
        creditsToAdd = 0;
      }

      user.credits += creditsToAdd;
      user.subscribed = true; // Set the subscribed field to true
	    user.subscriptionId = subscriptionId; // Save the subscription ID
      await user.save();
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

