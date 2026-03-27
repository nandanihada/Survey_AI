# Response Click → Signup Confirmation Flow
## Status: 🚀 In Progress (3/7 ✅)

**Plan Overview:**
- ResponseLogs "Continue Response" → /signup?responseId=xxx&surveyId=yyy  
- Signup → pending_users + confirmation email
- Email link → /confirm?token=zzz → user → dashboard/responses

## TODO Steps

### ✅ 1. TODO.md [DONE]

### ✅ 2. Backend APIs [DONE] 
```
✅ POST /api/auth/send-confirmation  
✅ GET /api/auth/confirm
✅ POST /api/auth/resend-confirmation 
```

### ✅ 3. ResponseLogs.tsx [DONE]
```
✅ "Continue Response" → signup w/ context (responseId, surveyId, username, email, ip)
```

### ⏳ 4. SignupPage.tsx + Form [CURRENT]
```
⏳ Read URL params → context state/banner
⏳ Prefill name/email in form
⏳ POST /api/auth/send-confirmation + responseContext 
```

### ⏳ 5. App.tsx
```
⏳ Route /confirm/:token → ConfirmPage
```

### ⏳ 6. ConfirmPage.tsx [NEW]
```
⏳ GET /api/auth/confirm?token → user + login
⏳ Redirect /dashboard/responses/{surveyId}
```

### ⏳ 7. Test
```
⏳ Backend restart: python Backend/app.py
⏳ Frontend: npm run dev  
⏳ Full E2E flow
```

**Progress: Backend APIs + Response click handler complete!**

