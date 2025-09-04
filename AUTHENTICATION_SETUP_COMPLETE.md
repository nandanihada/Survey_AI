# JWT Authentication System - Complete Setup Guide

## Overview
The authentication system has been successfully migrated from Firebase to JWT-based authentication with MongoDB. This provides better control over user management and survey ownership.

## Backend Components Implemented

### 1. Database Models (`mongodb_config.py`)
- **Users Collection**: Stores user credentials with bcrypt hashed passwords
- **Surveys Collection**: Updated with `ownerUserId` field for ownership tracking
- **User Sessions**: For session management (optional with JWT)

### 2. Authentication Service (`auth_service.py`)
- JWT token generation and verification
- Password hashing with bcrypt
- User registration and login
- Token validation and user retrieval

### 3. Authentication Middleware (`auth_middleware.py`)
- `@requireAuth`: Protects routes requiring authentication
- `@requireAdmin`: Protects admin-only routes
- `@optionalAuth`: For routes that work with/without auth
- Automatic token extraction from Authorization header

### 4. Authentication Routes (`auth_routes.py`)
- `POST /api/auth/register`: User registration
- `POST /api/auth/login`: User login
- `POST /api/auth/logout`: User logout
- `GET /api/auth/me`: Get current user info
- `GET /api/auth/check`: Check authentication status

### 5. Protected Survey Routes (`survey_routes.py`)
- `GET /api/surveys/`: Returns user's own surveys (admin sees all)
- Survey creation automatically assigns `ownerUserId`
- Survey editing/deletion restricted to owner or admin

### 6. Admin Routes (`admin_routes.py`)
- `GET /api/admin/users`: List all users
- `PUT /api/admin/users/{uid}/role`: Update user role
- `GET /api/surveys/admin/all`: Admin view of all surveys

## Frontend Components Implemented

### 1. Authentication Service (`authService.ts`)
- JWT token management in localStorage
- API calls with Authorization headers
- User registration and login
- Automatic token refresh handling

### 2. Authentication Context (`AuthContext.tsx`)
- React context for auth state management
- User authentication status
- Admin role checking
- Automatic auth state persistence

### 3. Authentication Components
- `LoginForm.tsx`: Custom login form
- `RegisterForm.tsx`: User registration form
- `LoginPage.tsx`: Combined login/register page
- `AuthGuard.tsx`: Route protection component

### 4. Protected Routes (`App.tsx`)
- `/login`: Public login page
- `/dashboard`: User dashboard (protected)
- `/admin`: Admin dashboard (admin only)
- All other routes require authentication

## Key Features

### User Ownership System
- Each survey is automatically assigned to the creating user
- Users can only see and edit their own surveys
- Admins can see and manage all surveys
- Survey list filtering based on user role

### Role-Based Access Control
- **User Role**: Can create, edit, and view own surveys
- **Admin Role**: Can manage all surveys and users
- Admin dashboard for user management

### Security Features
- JWT tokens with expiration
- Bcrypt password hashing
- Authorization header validation
- Automatic token cleanup on logout

## Setup Instructions

### 1. Environment Variables
Create `.env` file in Backend directory:
```
MONGODB_URI=mongodb://localhost:27017/survey_db
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRATION_HOURS=24
```

### 2. Install Dependencies
```bash
# Backend
cd Backend
pip install flask flask-cors pymongo bcrypt pyjwt python-dotenv

# Frontend
cd project
npm install
```

### 3. Start Services
```bash
# Backend (Terminal 1)
cd Backend
python app.py

# Frontend (Terminal 2)
cd project
npm run dev
```

### 4. Create Admin User
After starting the backend, create an admin user by registering normally, then manually update the role in MongoDB:
```javascript
// In MongoDB shell
db.users.updateOne(
  {email: "admin@example.com"}, 
  {$set: {role: "admin"}}
)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/check` - Check auth status

### Surveys (Protected)
- `GET /api/surveys/` - Get user's surveys
- `POST /api/surveys/` - Create new survey
- `PUT /api/surveys/{id}` - Update survey (owner only)
- `DELETE /api/surveys/{id}` - Delete survey (owner only)

### Admin (Admin Only)
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/{uid}/role` - Update user role
- `GET /api/surveys/admin/all` - Get all surveys

## Testing the System

### 1. User Registration/Login
1. Navigate to `/login`
2. Register a new account
3. Login with credentials
4. Verify redirect to dashboard

### 2. Survey Ownership
1. Create a survey as User A
2. Login as User B
3. Verify User B cannot see User A's surveys
4. Login as admin
5. Verify admin can see all surveys

### 3. Admin Functions
1. Login as admin
2. Navigate to `/admin`
3. Manage user roles
4. View all surveys

## Troubleshooting

### 401 Unauthorized Errors
- Check if JWT token is being sent in Authorization header
- Verify token hasn't expired
- Ensure backend JWT_SECRET matches

### Survey Ownership Issues
- Verify `ownerUserId` field is set on survey creation
- Check user role in database
- Ensure proper middleware is applied to routes

### Frontend Auth Issues
- Check localStorage for `auth_token`
- Verify API base URL configuration
- Check browser network tab for request headers

## Migration Notes

The system has been completely migrated from Firebase to JWT authentication:
- ✅ User registration and login
- ✅ JWT token management
- ✅ Survey ownership filtering
- ✅ Admin role management
- ✅ Protected routes
- ✅ Authentication middleware
- ✅ Frontend auth context

All Firebase dependencies have been removed and replaced with custom JWT implementation.
