# User-Based Postback System Guide

## 🎯 Overview

The User-Based Postback System allows survey creators to receive postback notifications when their surveys are completed. Instead of sending postbacks to external partners, the system now sends them directly to the users who created the surveys.

## 🔄 How It Works

### 1. User Registration
- Users sign up at `/signup` with their postback URL
- They configure custom parameter mappings for their system
- Example: `transaction_id` → `txn_id`, `username` → `customer_name`

### 2. Survey Creation
- When users create surveys, they're automatically linked via `ownerUserId`
- Survey contains creator identification fields
- No additional setup required

### 3. Survey Completion
- Someone completes the survey
- System identifies the survey creator
- Retrieves creator's postback URL and parameter mappings
- Sends customized postback to creator

### 4. Postback Delivery
- URL built using creator's custom parameter names
- All survey completion data included
- Creator receives notification in their preferred format

## 📋 System Components

### Backend Files
- `user_postback_sender.py` - Main postback sending logic
- `user_postback_api.py` - API endpoints for user management
- `app.py` - Integration with survey submission handler

### Database Collections
- `users` - User accounts with postback URLs and mappings
- `surveys` - Surveys linked to creators via `ownerUserId`
- `user_postback_logs` - Postback attempt logs

## 🔧 Configuration

### User Signup Data Structure
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "website": "https://johndoe.com",
  "postbackUrl": "https://johndoe.com/postback",
  "parameterMappings": {
    "transaction_id": "txn_id",
    "username": "customer_name",
    "status": "result",
    "payout": "amount"
  }
}
```

### Available Data Fields
The system can map these fields to user's custom parameter names:

- `transaction_id` - Unique transaction identifier
- `survey_id` - Survey identifier
- `username` - User's username or identifier
- `email` - User's email address
- `user_id` - User's ID in our system
- `simple_user_id` - User's simple numeric ID
- `session_id` - Survey session identifier
- `click_id` - Click tracking identifier
- `ip_address` - User's IP address
- `payout` - Payout amount
- `currency` - Currency code (USD, EUR, etc.)
- `status` - Completion status (completed, failed, etc.)
- `timestamp` - Completion timestamp
- `aff_sub` - Affiliate sub-identifier
- `sub1` - Sub parameter 1
- `sub2` - Sub parameter 2
- `responses` - Survey responses (JSON format)
- `responses_count` - Number of survey responses
- `completion_time` - Time taken to complete survey
- `user_agent` - User's browser user agent
- `referrer` - Page referrer URL

## 🚀 Example Flow

### 1. User Signs Up
```
POST /api/auth/signup
{
  "name": "Marketing Agency",
  "email": "agency@example.com",
  "postbackUrl": "https://agency.com/survey-complete",
  "parameterMappings": {
    "transaction_id": "conversion_id",
    "username": "lead_name",
    "email": "lead_email",
    "payout": "commission"
  }
}
```

### 2. User Creates Survey
- Survey automatically linked to user
- No additional configuration needed

### 3. Survey Completed
- Someone fills out the survey
- System processes completion

### 4. Postback Sent
```
GET https://agency.com/survey-complete?conversion_id=resp_123&lead_name=john&lead_email=john@test.com&commission=0.25&status=completed
```

## 📊 Monitoring & Logs

### Postback Logs
All postback attempts are logged in `user_postback_logs` collection:

```json
{
  "type": "user_postback",
  "survey_id": "survey_123",
  "creator_user_id": "user_456",
  "creator_name": "Marketing Agency",
  "url": "https://agency.com/survey-complete?...",
  "status": "success",
  "status_code": 200,
  "response": "OK",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Success Indicators
- ✅ `status: "success"` and `status_code: 200`
- ❌ `status: "failure"` with error details

## 🔍 Testing

### Test Script
Run the test script to verify the system:
```bash
python test_user_postback_system.py
```

### Manual Testing
1. Create account at `/signup` with postback URL
2. Create a survey
3. Complete the survey (or use test data)
4. Check postback logs for delivery confirmation

## 🛠️ API Endpoints

### User Management
- `POST /api/auth/signup` - Create user account with postback config
- `GET /api/user/profile` - Get user profile and postback settings
- `PUT /api/user/profile` - Update postback URL and mappings

### Admin Functions
- `GET /api/admin/users` - List all users and their postback configs
- `PUT /api/admin/users/{user_id}/postback` - Update user's postback settings

## 🔒 Security Considerations

### URL Validation
- Postback URLs must start with `http://` or `https://`
- URLs are validated during signup and updates

### Parameter Mapping
- Only predefined data fields can be mapped
- Invalid field mappings are rejected

### Request Timeout
- Postback requests timeout after 15 seconds
- Failed requests are logged with error details

## 🎯 Benefits

### For Survey Creators
- ✅ Receive notifications for their own surveys
- ✅ Custom parameter mapping for their systems
- ✅ Direct integration with their tracking systems
- ✅ Real-time completion notifications

### For Platform
- ✅ Simplified architecture (no partner management)
- ✅ User-centric approach
- ✅ Scalable to unlimited users
- ✅ Comprehensive logging and monitoring

## 🔄 Migration from Partner System

### Legacy Support
The system maintains backward compatibility:
- Old partner-based postbacks still work
- New user-based postbacks run in parallel
- Gradual migration possible

### Migration Steps
1. Users sign up with postback URLs
2. Create surveys (automatically linked)
3. Old partner mappings can be disabled
4. Full transition to user-based system

## 📞 Support

### Common Issues
1. **No postback received**: Check postback URL and user account setup
2. **Wrong parameters**: Verify parameter mappings in user profile
3. **Timeout errors**: Check if postback URL is accessible

### Debugging
- Check `user_postback_logs` collection for delivery status
- Run test script to verify system functionality
- Verify survey-user linking in database

---

**The User-Based Postback System provides a direct, customizable way for survey creators to receive completion notifications with their preferred parameter formats.**
