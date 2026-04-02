"""
Email Confirmation Flow Diagram

This file illustrates the complete flow of the email confirmation system.
"""

# REGISTRATION & EMAIL CONFIRMATION FLOW

plaintext = """

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMAIL CONFIRMATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘


STEP 1: USER REGISTRATION
═════════════════════════════════════════════════════════════════════════════

    Frontend                              Backend
    ────────────────────────────────────────────────────────────────────────
    
    [Registration Form]
    ↓
    Email + Password + Name
    ↓
    POST /api/auth/register
    └─────────────────────────────────→ auth_routes.py
                                         ↓
                                         register_user()
                                         ↓
                                         Generate UUID token
                                         ↓
                                         Create user with
                                         status="pending_confirmation"
                                         ↓
                                         send_confirmation_email()
                                         ↓
                                         Connect to SMTP
                                         ↓
                                         Send HTML email with:
                                         - Confirmation link
                                         - 24h expiration notice
                                         ↓
                                         Return {
                                           message: "Check email",
                                           user: {...}
                                         }
    ←─────────────────────────────────
    
    Show message:
    "✅ Registration successful.
     Please check your email
     to confirm your account."


STEP 2: USER RECEIVES EMAIL
═════════════════════════════════════════════════════════════════════════════

    Gmail Inbox
    ┌────────────────────────────────┐
    │ From: your-email@gmail.com     │
    │ To: user@example.com           │
    │ Subject: Confirm your email    │
    │ ────────────────────────────── │
    │                                │
    │ Welcome to Survey AI!          │
    │                                │
    │ [CONFIRM EMAIL ADDRESS]  ←──── Link to:
    │                                │ /confirm-email?token=...
    │ If link doesn't work:          │
    │ Copy paste: http://...?token=..│
    │                                │
    │ This link expires in 24 hours. │
    └────────────────────────────────┘


STEP 3: USER CLICKS CONFIRMATION LINK
═════════════════════════════════════════════════════════════════════════════

    Browser URL:
    http://localhost:3000/confirm-email?token=8c3c2f1a-3d4e-4f2a-b1c9-7e8f9a0b1c2d
    ↓
    Renders: <EmailConfirmation />
    ↓
    Extract token from URL
    ↓
    Call: authService.confirmEmail(token)
    ↓
    POST /api/auth/confirm-email
    └─────────────────────────────→ auth_routes.py
                                     ↓
                                     confirm_email()
                                     ↓
                                     Find user by token
                                     ↓
                                     Verify token exists
                                     ↓
                                     Check not already confirmed
                                     ↓
                                     Update status:
                                     pending_confirmation → approved
                                     ↓
                                     Remove confirmationToken
                                     ↓
                                     Return {
                                       message: "Confirmed!",
                                       user: {...status: "approved"}
                                     }
    ←─────────────────────────────
    
    Frontend Display:
    ┌─────────────────────────────┐
    │        ✅ EMAIL CONFIRMED   │
    │                             │
    │ Your email has been        │
    │ confirmed! You can now     │
    │ login to your account.     │
    │                             │
    │ Redirecting to login...    │
    └─────────────────────────────┘
    
    (Auto-redirect after 3 seconds)
    ↓
    Redirect to: /login


STEP 4: USER LOGS IN
═════════════════════════════════════════════════════════════════════════════

    [Login Form]
    Email: user@example.com
    Password: ••••••
    ↓
    POST /api/auth/login
    └─────────────────────────────→ auth_routes.py
                                     ↓
                                     authenticate_user()
                                     ↓
                                     Find user by email
                                     ↓
                                     Verify password
                                     ↓
                                     Check status via
                                     RoleManager.can_login()
                                     ↓
                                     IF status != "approved"
                                     └─→ DENY LOGIN ❌
                                     
                                     IF status == "approved"
                                     └─→ Generate JWT Token
                                        ↓
                                        Return {
                                          token: "eyJhbGc...",
                                          user: {...}
                                        }
    ←─────────────────────────────
    
    Store token in localStorage
    ↓
    Redirect to: /dashboard
    ↓
    ✅ FULL ACCESS!


DATABASE STATE CHANGES
═════════════════════════════════════════════════════════════════════════════

    BEFORE REGISTRATION:
    └─→ User doesn't exist
    
    AFTER REGISTRATION:
    └─→ {
          email: "user@example.com",
          passwordHash: "$2b$12$...",
          name: "User Name",
          status: "pending_confirmation",  ← KEY: Not approved yet!
          confirmationToken: "8c3c2f1a-...",
          role: "basic",
          createdAt: ISODate(...)
        }
    
    AFTER EMAIL CONFIRMATION:
    └─→ {
          email: "user@example.com",
          passwordHash: "$2b$12$...",
          name: "User Name",
          status: "approved",               ← CHANGED!
          ← confirmationToken removed
          role: "basic",
          createdAt: ISODate(...)
        }


ERROR FLOWS
═════════════════════════════════════════════════════════════════════════════

    SCENARIO 1: Click confirmation link twice
    ─────────────────────────────────────────
    First click:  ✅ Success → status becomes "approved"
    Second click: ❌ Error → "Email already confirmed"
                             or "Invalid token"
    
    
    SCENARIO 2: Try to login before confirming
    ──────────────────────────────────────────
    POST /api/auth/login
    ↓
    Can_login = RoleManager.can_login("pending_confirmation")
    ↓
    Returns: (False, "Email confirmation required")
    ↓
    ❌ Login denied
    Response: {
      error: "Email confirmation required. 
              Please check your email."
    }
    
    
    SCENARIO 3: Email not received
    ──────────────────────────────
    User checks email
    ↓
    Email not there
    ↓
    Click "Resend confirmation"
    ↓
    POST /api/auth/resend-confirmation
    ↓
    New token generated
    ↓
    New email sent
    ↓
    User receives and clicks link


SECURITY CONSIDERATIONS
═════════════════════════════════════════════════════════════════════════════

    ✅ Tokens are UUIDs (cryptographically secure)
       └─→ Random: 8c3c2f1a-3d4e-4f2a-b1c9-7e8f9a0b1c2d
    
    ✅ Tokens are unique per user
       └─→ Can't reuse across accounts
    
    ✅ Tokens are removed after use
       └─→ Can't use same token twice
    
    ✅ Unconfirmed accounts get special status
       └─→ Cannot access ANY features
    
    ✅ Email validation before sending
       └─→ Must be valid email format
    
    ✅ Status-based access control
       └─→ RoleManager checks status on login
    
    ✅ SMTP over TLS
       └─→ gmail.com enforces encryption


COMPLETION FLOW
═════════════════════════════════════════════════════════════════════════════

    User Journey Complete! 🎉
    
    Day 0:
    ├─→ 10:00 AM - User registers
    └─→ Receives confirmation email
    
    Day 0:
    ├─→ 10:05 AM - User clicks link
    └─→ Email confirmed
    
    Day 0:
    ├─→ 10:10 AM - User logs in
    └─→ Full dashboard access ✨


INTEGRATION POINTS
═════════════════════════════════════════════════════════════════════════════

    ┌─────────────────────────────────────┐
    │     Frontend (React/TypeScript)     │
    ├─────────────────────────────────────┤
    │ • RegisterForm.tsx                  │
    │ • EmailConfirmation.tsx (NEW)       │
    │ • LoginForm.tsx                     │
    │ • authService.ts                    │
    │ • AuthContext.tsx                   │
    └──────────────┬──────────────────────┘
                   │
              REST API
                   │
    ┌──────────────┴──────────────────────┐
    │      Backend (Flask/Python)         │
    ├─────────────────────────────────────┤
    │ • auth_routes.py (/register)        │
    │ • auth_routes.py (/confirm-email)   │
    │ • auth_routes.py (/login)           │
    │ • auth_service.py (email sending)   │
    │ • role_manager.py (status checks)   │
    └──────────────┬──────────────────────┘
                   │
              Database
                   │
    ┌──────────────┴──────────────────────┐
    │    MongoDB (users collection)       │
    ├─────────────────────────────────────┤
    │ • email                             │
    │ • passwordHash                      │
    │ • status (PENDING/APPROVED)         │
    │ • confirmationToken                 │
    │ • role, permissions                 │
    └─────────────────────────────────────┘


"""

print(plaintext)
