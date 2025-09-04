# Complete Authentication Setup Guide

## Quick Start (Testing)

### 1. Test the System First
Run the simple test server to verify the authentication flow works:

```bash
cd Backend
python test_auth_simple.py
```

This starts a test server on port 5001 with mock authentication.

### 2. Test Frontend Integration
Update your frontend to point to the test server:

```bash
cd project
# Create .env file
echo "VITE_API_URL=http://localhost:5001" > .env
npm run dev
```

## Production Setup

### 1. Firebase Configuration

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project: `your-survey-app`

2. **Enable Authentication**
   - Authentication > Sign-in method > Google > Enable
   - Add authorized domains: `localhost`, `pepperads.in`, your production domain

3. **Get Configuration**
   - Project Settings > General > Your apps > Web app
   - Copy the config values

4. **Service Account**
   - Project Settings > Service accounts
   - Generate new private key
   - Save as `Backend/firebase-service-account.json`

### 2. Environment Setup

**Backend (.env):**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/dynamic_widget_system

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-web-api-key
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Server
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

### 3. Database Setup

```bash
cd Backend
python database_migrations.py
```

### 4. Start Services

**Backend:**
```bash
cd Backend
python app.py
```

**Frontend:**
```bash
cd project
npm run dev
```

## API Endpoints

### Authentication
- `GET /auth/login` - Get Firebase config
- `POST /auth/verify-token` - Verify Firebase ID token
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user
- `GET /auth/check` - Check auth status

### Surveys (Protected)
- `GET /api/surveys` - Get user's surveys
- `POST /api/surveys` - Create survey
- `GET /api/surveys/:id` - Get survey (with ownership check)
- `PUT /api/surveys/:id` - Update survey
- `DELETE /api/surveys/:id` - Delete survey

### Admin Only
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role
- `GET /api/surveys/admin/all` - Get all surveys with owner info

## User Flow

1. **Main Site (pepperads.in)**
   - "Start Creating" button → `/dashboard` (triggers login if needed)

2. **Dashboard Access**
   - Unauthenticated → Login prompt
   - User → See own surveys
   - Admin → See all surveys + user management

3. **Survey Ownership**
   - Surveys linked to `owner_user_id`
   - Users see only their surveys
   - Admins see all surveys

## Troubleshooting

### OAuth Error 401: invalid_client
- Check Firebase project configuration
- Verify authorized domains in Firebase console
- Ensure correct API keys in environment files

### Session Issues
- Check cookie settings (httpOnly, secure, samesite)
- Verify CORS configuration includes credentials
- Check session expiration (7 days default)

### Database Connection
- Verify MongoDB URI in .env
- Run database migrations
- Check collection indexes
