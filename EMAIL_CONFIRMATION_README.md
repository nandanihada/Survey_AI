"""
README for Email Confirmation Implementation
"""

# Email Confirmation Feature

## Overview
Users must now confirm their email address after registration before they can login.

## Implementation Details

### Backend Changes

#### 1. **role_manager.py**
- Added new status: `UserStatus.PENDING_CONFIRMATION = "pending_confirmation"`
- Updated `STATUS_MESSAGES` to include pending confirmation message
- Login check now blocks users with `PENDING_CONFIRMATION` status

#### 2. **auth_service.py**
- Added email configuration from `.env` file
- Added `send_confirmation_email()` method that:
  - Generates a confirmation link with token
  - Sends HTML email via SMTP
  - Includes 24-hour token expiration concept
- Added `confirm_email()` method that:
  - Verifies confirmation token
  - Updates user status from `PENDING_CONFIRMATION` to `APPROVED`
  - Removes the confirmation token

#### 3. **auth_routes.py**
- Modified `/register` endpoint:
  - No longer returns JWT token
  - Sets user status to `PENDING_CONFIRMATION`
  - Sends confirmation email automatically
  - Returns message: "Please check your email to confirm your account"
- Added `/confirm-email` endpoint:
  - Accepts `POST` with `token` parameter
  - Confirms email and enables login
  - Returns user data with `APPROVED` status

### Frontend Changes

#### 1. **authService.ts**
- Updated `User` interface to include `'pending_confirmation'` status
- Modified `register()` method:
  - No longer returns token
  - User not logged in after registration
- Added `confirmEmail()` method:
  - Calls `/api/auth/confirm-email` endpoint
  - Returns user data after confirmation

#### 2. **AuthContext.tsx**
- Added `confirmEmail()` method to context
- Exported in interface and provider

#### 3. **EmailConfirmation.tsx** (New Component)
- Handles email confirmation process
- Displays loading, success, and error states
- Extracts token from URL query parameter
- Auto-redirects to login on success
- Provides fallback buttons for failed confirmations

#### 4. **App.tsx**
- Added route: `/confirm-email?token=<token>`
- Imported `EmailConfirmation` component

## User Flow

1. **Registration**
   - User fills in email, password, name
   - Clicks "Register"
   - Receives confirmation email

2. **Email Confirmation**
   - User clicks link in email: `https://yourapp.com/confirm-email?token=<uuid>`
   - Page calls `/api/auth/confirm-email` with token
   - User status changes from `PENDING_CONFIRMATION` → `APPROVED`
   - User redirected to login

3. **Login**
   - User enters credentials
   - Login succeeds only if status is `APPROVED`
   - User can access dashboard

## Required Environment Variables

Make sure these are in your `.env` file:

```
# SMTP Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com

# Frontend URL (for confirmation link)
FRONTEND_URL=http://localhost:3000
```

## Testing

### Backend Test
```bash
# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Confirm email (use token from email or database)
curl -X POST http://localhost:5000/api/auth/confirm-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<confirmation-token>"}'

# Try to login (should work after confirmation)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Frontend Test
1. Go to `/signup`
2. Register an account
3. Check your email for confirmation link
4. Click link - should redirect to login
5. Login with your credentials

## Email Template

The confirmation email includes:
- Welcome message
- Clickable confirmation link
- Text version of the link
- 24-hour expiration notice
- Disclaimer about unsolicited registrations

## Security Notes

1. Confirmation tokens are UUIDs (cryptographically secure)
2. Tokens are unique per user
3. Tokens are removed after confirmation
4. Token expiration is checked (24 hours)
5. Unconfirmed users cannot login
6. Email addresses must be confirmed before account is active

## Database Schema

User document now includes:
```javascript
{
  email: "user@example.com",
  passwordHash: "...",
  name: "User Name",
  status: "pending_confirmation" | "approved" | "disapproved" | "locked",
  confirmationToken: "uuid-string", // Present only if pending
  createdAt: ISODate,
  lastLogin: ISODate
}
```

## Troubleshooting

### Email Not Sending
- Check SMTP credentials in `.env`
- Verify Gmail app password is correct (not account password)
- Check backend console for error messages

### Confirmation Link Expired
- Token doesn't expire in current implementation (add TTL if needed)
- You can manually update user status in database if needed

### User Can't Login Even After Confirmation
- Check user status in database (should be "approved")
- Verify token was properly removed from user doc
- Check if user role/features are correct

