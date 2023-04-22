# nolimitGPT Web App

[App hosted on HerokuApp](https://rocky-falls-15188.herokuapp.com/)   

## Introduction

The nolimitGPT web app is a simple and accessible SAAS web app template designed for developers to learn and create AI-based web apps. The project leverages advanced technologies such as OpenAI, MongoDB, and Stripe, making SAAS web app development less daunting.

## Features

- Node.js, Express, and EJS for web app framework
- OpenAI API for AI-driven text interactions and image generation
- Stripe for subscription management
- Google OAuth for user authentication
- MongoDB for user administration
- Responsive front-end with Webflow CSS and JavaScript

## Getting Started

To run the project locally, follow these steps:

1. Clone the repository from GitHub.
2. Install Node.js and npm (Node Package Manager) if you haven't already.
3. Navigate to the project directory and run `npm install` to install dependencies.
4. Rename the provided `example.env` file to `.env` and replace the placeholders with your actual keys and credentials. To obtain the required API keys, follow the instructions below:
   - For the OpenAI API key, sign up for an account at [OpenAI](https://beta.openai.com/signup/) and follow their instructions to generate an API key.
   - For the Stripe secret key, create an account at [Stripe](https://dashboard.stripe.com/register) and navigate to the API section in the dashboard to get your secret key. Create three monthly subscription plans in Stripe and note their price IDs. Also, obtain your Stripe public key.
   - To obtain Google Client ID and Google Client Secret, visit [Google Developers Console](https://console.developers.google.com/) and create a new project. Enable the required Google APIs (e.g., Google+ API, Google OAuth2 API) and create an OAuth 2.0 client ID. You'll be provided with the client ID and secret.
   - For the MongoDB URI, sign up for an account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a new cluster. Then, create a user with appropriate permissions, and you'll be able to generate the connection URI.
5. Set a secure `SESSION_SECRET` value in the `.env` file. This can be any long, random string.
6. Locate the following variables in the frontend JavaScript code, index.js and views/dashboard.ejs and replace them with your own values:
   - `stripePublicKey`: Your Stripe public key.
   - `priceTrial`: The price ID for the trial plan.
   - `pricePlan1`: The price ID for plan 1.
   - `pricePlan2`: The price ID for plan 2.
7. Start the server by running `npm start`.
8. Install the Stripe CLI by following the instructions provided in the [Stripe CLI documentation](https://stripe.com/docs/stripe-cli#install).
9. Run the following command to listen for webhook events on your local machine:
`stripe listen --forward-to http://localhost:3000/webhook`

10.  Open your web browser and go to `http://localhost:3000` to view the web app.

## Roadmap

New contributors can start working on the following tasks:

- Enhance the user experience by adding features like image galleries, voice input, and chat history.
- Integrate additional APIs for more diverse content generation.
- Improve the front-end design and responsiveness for various devices.
- Optimize server performance and handling of API calls.
- Implement user authentication and account management.

