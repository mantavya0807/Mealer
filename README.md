# Penn State Meal Plan Optimizer

A web application that helps Penn State students analyze and optimize their campus meal plan spending through automated data collection, real-time analytics, and personalized recommendations.

## Features

- **Automated Data Collection**: Securely fetches transaction data from Penn State's dining portal
- **Spending Analytics**: Real-time visualization of spending patterns and trends
- **Meal Plan Optimization**: Personalized recommendations for maximizing meal plan value
- **Multi-User Comparison**: Compare spending patterns with other users
- **Discount Analysis**: Track savings and identify opportunities for better value

## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- Firebase Authentication

### Backend
- Firebase Cloud Functions
- Firestore Database
- Node.js with TypeScript
- Puppeteer for automated data collection

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI
- A Penn State account

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/meal-plan-optimizer.git
cd meal-plan-optimizer
```

2. Install dependencies
```bash
npm install
cd functions
npm install
```

3. Set up Firebase
```bash
npm install -g firebase-tools
firebase login
firebase init
```

4. Create a `.env` file in the root directory with your Firebase config:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

5. Start the development server
```bash
npm start
```

6. In a separate terminal, start the Firebase emulators
```bash
cd functions
npm run serve
```

## Usage

1. Sign in with your Penn State credentials
2. Enter your verification code when prompted
3. Select your date range for transaction analysis
4. View your personalized spending analytics and recommendations
5. Compare your spending patterns with other users
6. Download transaction history or view detailed reports

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

- All user credentials are securely handled and never stored
- Multi-factor authentication is required for data access
- Firebase security rules protect user data
- All API requests are authenticated and rate-limited


- Firebase team for their excellent documentation
- The React and TypeScript communities

## Support

For support, email your-email@psu.edu or open an issue in the repository.
