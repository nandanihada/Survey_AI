# Authentication System Setup Guide

## Overview
This guide sets up Firebase Authentication with your survey dashboard project.

## Backend Setup

### 1. Firebase Project Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing project
3. Enable Authentication > Sign-in method > Google
4. Go to Project Settings > General > Your apps
5. Add a web app and copy the config

### 2. Environment Variables

Update your `.env` file with these variables:

```env
# Firebase Authentication
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-web-api-key
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

### 3. Service Account Key

1. Go to Project Settings > Service accounts
2. Click "Generate new private key"
3. Save the JSON file as `firebase-service-account.json` in your Backend directory
4. Update the path in your `.env` file

### 4. Run Database Migrations

```bash
cd Backend
python database_migrations.py
```

## Frontend Setup

### 1. Install Firebase SDK

```bash
cd project
npm install firebase
```

### 2. Environment Variables

Create `.env` file in project directory:

```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

## API Endpoints

### Authentication Routes
- `GET /auth/login` - Get Firebase config
- `POST /auth/verify-token` - Verify Firebase ID token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user
- `GET /auth/check` - Check auth status

### Survey Routes (Protected)
- `GET /api/surveys` - Get user's surveys
- `POST /api/surveys` - Create survey
- `GET /api/surveys/:id` - Get survey
- `PUT /api/surveys/:id` - Update survey
- `DELETE /api/surveys/:id` - Delete survey

### Admin Routes
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role
- `GET /api/surveys/admin/all` - Get all surveys

## User Roles

- **user**: Can create and manage their own surveys
- **admin**: Can manage all surveys and users

## Next Steps

1. Configure Firebase project
2. Update environment variables
3. Run database migrations
4. Install Firebase SDK on frontend
5. Implement Firebase Auth on frontend
6. Test authentication flow
