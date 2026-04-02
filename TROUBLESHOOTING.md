# Email Confirmation - Troubleshooting Guide

## Common Issues & Solutions

### 🔴 Issue: "Email service not configured" message

**Problem**: Email is not being sent after registration

**Solutions**:
1. Check `.env` file has these variables:
   ```
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password  (NOT your regular password)
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   FROM_EMAIL=your-email@gmail.com
   ```

2. For Gmail, you MUST use an "App Password":
   - Go to myaccount.google.com
   - Security → App passwords
   - Generate password for "Mail" and "Windows"
   - Use that 16-character password in SMTP_PASSWORD

3. Restart backend after changing `.env`:
   ```bash
   cd Backend && python app.py
   ```

---

### 🔴 Issue: Registration works but no email received

**Problem**: User is registered but confirmation email isn't in inbox

**Solutions**:
1. Check spam/junk folder
2. Check backend console for error messages
3. Verify sender domain:
   - In Gmail settings, check if the email is authenticated
   - Emails from gmail.com should work by default

4. Test SMTP connection manually:
   ```python
   import smtplib
   server = smtplib.SMTP('smtp.gmail.com', 587)
   server.starttls()
   server.login('your-email@gmail.com', 'your-app-password')
   print("✅ SMTP connection successful")
   server.quit()
   ```

---

### 🔴 Issue: "Invalid or expired confirmation token"

**Problem**: Clicking confirmation link shows error

**Solutions**:
1. Check token wasn't already used
   - Tokens are removed from database after use
   - Clicking link twice will fail on second attempt
   - User must request new confirmation email

2. Verify URL is correct:
   - Should be: `http://localhost:3000/confirm-email?token=<uuid>`
   - Token should be at least 36 characters (UUID length)

3. Check user status in database:
   ```bash
   # In MongoDB or MongoDB Compass
   db.users.findOne({email: "test@example.com"})
   # Check 'status' field and 'confirmationToken' field
   ```

4. If token is missing from database:
   - Token was already used (need to register again)
   - OR token was manually removed (user already confirmed)

---

### 🔴 Issue: "User cannot login even after confirmation"

**Problem**: After confirming email, login still fails

**Solutions**:
1. Check user status in database:
   ```javascript
   db.users.findOne({email: "test@example.com"})
   // Should have: "status": "approved"
   // Should NOT have: "confirmationToken" field
   ```

2. If status is still "pending_confirmation":
   - Confirmation didn't complete
   - Try confirming again
   - Check backed console for errors

3. If status is "disapproved" or "locked":
   - Admin need to update status
   - Use MongoDB Compass or:
     ```javascript
     db.users.updateOne(
       {email: "test@example.com"},
       {$set: {status: "approved"}}
     )
     ```

4. Clear browser cache:
   - LocalStorage might have stale auth data
   - Edit → Preferences → Clear browsing data
   - Cookies & cached images

---

### 🟡 Issue: Confirmation page shows "Loading..." forever

**Problem**: Email confirmation page hangs on loading

**Solutions**:
1. Check if token exists in URL:
   - Look at browser address bar
   - Should have `?token=...`
   - If not, copy full link from email

2. Check backend is running:
   ```bash
   curl http://localhost:5000/api/auth/confirm-email \
     -H "Content-Type: application/json" \
     -d '{"token":"test"}'
   # Should get JSON response (error is ok, proves backend works)
   ```

3. Check browser console for errors:
   - Press F12 in browser
   - Go to Console tab
   - Look for red error messages
   - Screenshot and share if needed

4. Network issues:
   - Check if API URL matches (localhost:5000 vs production URL)
   - In authService.ts, verify:
     ```typescript
     const hostname = window.location.hostname;
     const isLocal = hostname.includes('localhost') || hostname === '127.0.0.1';
     this.baseUrl = isLocal ? 'http://localhost:5000' : 'https://api.pepperwahl.com';
     ```

---

### 🟡 Issue: Wrong sender email in confirmation email

**Problem**: Email comes from wrong address or shows weird sender

**Solutions**:
1. Check FROM_EMAIL matches SMTP_USERNAME
2. Gmail will always use your Gmail account as sender
3. You cannot send from a different email via Gmail SMTP
4. To use a different sender:
   - Use the company's email service
   - Or use SendGrid/Mailgun API instead

---

### 🟡 Issue: Frontend shows wrong baseUrl

**Problem**: Frontend is calling wrong backend URL

**Solutions**:
1. Check App.tsx imports:
   ```typescript
   const hostname = window.location.hostname;
   const isLocal = hostname.includes('localhost') || hostname === '127.0.0.1';
   this.baseUrl = isLocal ? 'http://localhost:5000' : 'https://api.pepperwahl.com';
   ```

2. Browser developer tools:
   - Press F12
   - Go to Console
   - Type: `authService.baseUrl`
   - Should show correct URL

3. Network tab:
   - F12 → Network tab
   - Register/login
   - Look at request URL
   - Should be localhost:5000 or your production API

---

### ✅ Debug Checklist

When something doesn't work, check these in order:

```
□ Backend running? (python app.py in Backend folder)
□ Frontend running? (npm run dev in project folder)
□ .env file has SMTP credentials?
□ Used Gmail App Password (not account password)?
□ Restarted backend after changing .env?
□ Correct confirmation link format?
□ User exists in MongoDB?
□ Check backend console for error messages
□ Check browser console (F12) for errors
□ Network tab showing correct API URL?
□ User status in DB is "approved"?
□ Confirmation token removed from DB?
```

---

### 📞 Getting Help

**Collect these when reporting issues:**

1. Full error message (screenshot)
2. Backend console output (last 20 lines)
3. Browser console errors (F12)
4. Network request details (F12 → Network → Registration request)
5. User data from MongoDB:
   ```javascript
   db.users.findOne({email: "your-test-email@example.com"})
   ```
6. .env file (WITHOUT passwords):
   ```
   SMTP_SERVER=?
   SMTP_PORT=?
   FRONTEND_URL=?
   ```

---

### 🧪 Manual Testing Commands

**Test SMTP Connection:**
```bash
cd Backend && python
>>> from auth_service import auth_service = AuthService()
>>> auth_service.send_confirmation_email("test@example.com", "test-token")
# Check if email is received
```

**Test Token Confirmation:**
```bash
curl -X POST http://localhost:5000/api/auth/confirm-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<real-token-from-db>"}'
```

**Test Login After Confirmation:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

### 🔄 Reset User (If Stuck)

If a user is stuck in "pending_confirmation":

```javascript
// In MongoDB or MongoDB Compass
db.users.deleteOne({email: "test@example.com"})

// OR

db.users.updateOne(
  {email: "test@example.com"},
  {
    $set: {status: "approved"},
    $unset: {confirmationToken: ""}
  }
)
```

Then the user can login without email confirmation.

---

### 📊 Database Inspection

View pending users:
```javascript
db.users.find({status: "pending_confirmation"})
```

View all users and status:
```javascript
db.users.find({}, {email: 1, status: 1, confirmationToken: 1})
```

Find user by email:
```javascript
db.users.findOne({email: "test@example.com"})
```

---

### 🎯 Expected Behavior

**Registration → Email Sent:**
- Browser: "Registration successful. Please check your email"
- Backend console: "✅ Confirmation email sent to test@example.com"
- User inbox: Receives email from your SMTP sender

**Click Email Link:**
- Frontend: Shows "Confirming your email..." → Loading state
- Backend: Processes token
- Frontend: Shows "✅ Email Confirmed! Redirecting to login..."

**After Redirect:**
- User on login page
- Can enter credentials
- Login succeeds (gets JWT token)
- Redirects to dashboard

---

Hope this helps troubleshoot! The most common issue is Gmail app passwords. 🚀

