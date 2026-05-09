# LibraLearn Authentication Backend

A Node.js backend API for user authentication using Firebase Authentication. This backend provides RESTful endpoints for user signup, login, and password reset functionality.

## Features

- **User Authentication**: Firebase Admin SDK integration
- **Email Validation**: Proper email format validation
- **Password Strength**: Enforces strong password requirements
- **Error Handling**: Comprehensive error responses
- **Security**: Secure token generation and validation
- **CORS Support**: Configurable for frontend integration

## API Endpoints

### POST /api/auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "emailVerified": false,
    "customToken": "firebase-custom-token"
  }
}
```

**Error Responses:**
- `400`: Invalid email format or weak password
- `409`: Email already exists
- `500`: Internal server error

### POST /api/auth/login
Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "emailVerified": false,
    "customToken": "firebase-custom-token",
    "lastSignInTime": "2023-12-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Invalid email format
- `401`: Invalid credentials
- `500`: Internal server error

### POST /api/auth/reset-password
Send a password reset link to user's email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent successfully"
}
```

**Development Response (includes resetLink):**
```json
{
  "success": true,
  "message": "Password reset link sent successfully",
  "resetLink": "https://firebase-reset-link"
}
```

**Error Responses:**
- `400`: Invalid email format
- `500`: Internal server error

## Password Requirements

Passwords must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*(),.?":{}|<>)

## Setup Instructions

### 1. Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Authentication enabled

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication with Email/Password provider
4. Go to Project Settings > Service Accounts
5. Generate a new private key and download the JSON file
6. Copy the `.env.example` file to `.env`
7. Update `.env` with your Firebase credentials:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
PORT=3000
NODE_ENV=development
```

### 4. Start the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Frontend Integration

### Using Firebase Client SDK

For the best user experience, use the Firebase Client SDK in your frontend along with the custom tokens provided by this backend:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Login with custom token from backend
async function login(email, password) {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Sign in with custom token
      const userCredential = await signInWithCustomToken(auth, data.data.customToken);
      console.log('User signed in:', userCredential.user);
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}
```

### Direct API Usage

You can also use the API endpoints directly without Firebase Client SDK:

```javascript
// Signup
async function signup(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
}

// Login
async function login(email, password) {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
}

// Reset Password
async function resetPassword(email) {
  const response = await fetch('http://localhost:3000/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Yes |
| `FIREBASE_DATABASE_URL` | Firebase database URL | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

## Security Considerations

- Store Firebase credentials securely in environment variables
- Enable email verification in Firebase Console for production
- Use HTTPS in production
- Implement rate limiting for sensitive endpoints
- Validate all input data on both client and server side
- Never expose private keys or sensitive data in client-side code

## Health Check

Check if the server is running:
```bash
curl http://localhost:3000/health
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

In development mode, error details include stack traces for debugging.

## License

MIT License
