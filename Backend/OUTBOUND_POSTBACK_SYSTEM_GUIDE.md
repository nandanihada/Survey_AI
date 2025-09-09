# Outbound Postback System Guide

## Overview
The outbound postback system allows you to send postbacks to third-party partners when surveys are completed or when manually triggered for testing.

## System Components

### 1. Backend Components

#### `integrations.py`
- **`forward_survey_data_to_partners(response_data)`**: Main function that sends postbacks to all active partners
- **`log_postback_attempt(partner_name, url, status_code, response_text)`**: Logs outbound postback attempts
- **`replace_postback_parameters(url, response_data)`**: Replaces URL placeholders with actual data

#### `outbound_postback_api.py` (NEW)
- **`/api/outbound-postback/test`**: Manual trigger for testing outbound postbacks
- **`/api/outbound-postback/send-to-partner`**: Send postback to specific partner URL
- **`/api/outbound-postback/partners`**: Get list of active partners

#### `postback_api.py`
- **`/api/postback-logs`**: Get outbound postback logs for display

### 2. Frontend Components

#### Enhanced `PostbackManager.tsx`
- New "Outbound Logs" tab to view sent postbacks
- Test interface to manually send postbacks to partners
- Real-time feedback on postback success/failure

### 3. Database Collections

#### `partners`
- Stores third-party partner information
- Fields: `name`, `url`, `status`, `created_at`

#### `outbound_postback_logs`
- Logs all outbound postback attempts
- Fields: `type`, `partnerName`, `url`, `status`, `status_code`, `response`, `timestamp`

## How It Works

### Automatic Postbacks (Survey Completion)
1. When a survey is completed in `app.py`, the system triggers `forward_survey_data_to_partners()`
2. Function fetches all active partners from database
3. For each partner, it replaces URL placeholders with actual survey data
4. Sends HTTP GET request to partner's postback URL
5. Logs the attempt with status and response

### Manual Testing
1. Use the "Outbound Logs" tab in PostbackManager
2. Enter partner URL with placeholders like `[TRANSACTION_ID]`, `[REWARD]`
3. Click "Send Test" to trigger manual postback
4. View results in real-time and check logs

## URL Placeholders

The system supports these placeholders in partner URLs:

### Standard Parameters
- `[TRANSACTION_ID]` - Unique transaction identifier
- `[REWARD]` / `[PAYOUT]` - Reward amount
- `[CURRENCY]` - Currency code (USD, EUR, etc.)
- `[USERNAME]` - User's username
- `[SESSION_ID]` - Session identifier
- `[COMPLETE_ID]` - Completion identifier
- `[SURVEY_ID]` - Survey identifier
- `[EMAIL]` - User's email
- `[STATUS]` - Completion status

### Extended Parameters
- `[CLICK_ID]` - Click identifier
- `[OFFER_ID]` - Offer identifier
- `[CONVERSION_STATUS]` - Conversion status
- `[SUB1]` / `[SUB2]` - Tracking parameters
- `[EVENT_NAME]` - Event name
- `[TIMESTAMP]` - Current timestamp
- `[USER_ID]` - User ID
- `[IP]` - IP address

## Example Partner URLs

```
https://partner.com/postback?transaction_id=[TRANSACTION_ID]&reward=[REWARD]&currency=[CURRENCY]

https://affiliate.com/track?click_id=[CLICK_ID]&payout=[PAYOUT]&status=[STATUS]

https://network.com/callback?offer_id=[OFFER_ID]&user_id=[USER_ID]&amount=[REWARD]
```

## Testing the System

### 1. Add Test Partner
```python
test_partner = {
    "name": "HTTPBin Test",
    "url": "https://httpbin.org/get?transaction_id=[TRANSACTION_ID]&reward=[REWARD]",
    "status": "active",
    "created_at": datetime.utcnow()
}
db.partners.insert_one(test_partner)
```

### 2. Trigger Manual Test
- Go to PostbackManager → Outbound Logs tab
- Enter partner URL and name
- Click "Send Test"
- Check results and logs

### 3. API Testing
```bash
curl -X POST https://api.theinterwebsite.space/api/outbound-postback/test \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "TEST_123", "reward": "5.00"}'
```

## Monitoring

### Outbound Logs
- View all sent postbacks in PostbackManager → Outbound Logs
- Shows partner name, URL, status, response, timestamp
- Refresh logs to see latest attempts

### Database Queries
```javascript
// Get recent outbound logs
db.outbound_postback_logs.find().sort({timestamp: -1}).limit(10)

// Get success rate
db.outbound_postback_logs.aggregate([
  {$group: {
    _id: "$status",
    count: {$sum: 1}
  }}
])
```

## Troubleshooting

### Common Issues
1. **No postbacks sent**: Check if partners are marked as "active"
2. **404 errors**: Verify partner URLs are correct
3. **Timeout errors**: Partner server may be slow/down
4. **Parameter errors**: Check URL placeholder format

### Debug Steps
1. Check partner configuration in database
2. Review outbound logs for error messages
3. Test partner URLs manually in browser
4. Use HTTPBin for testing: `https://httpbin.org/get?param=value`

## Security Notes
- All outbound requests have 15-second timeout
- Partner URLs should use HTTPS when possible
- Sensitive data is logged but truncated (first 500 chars)
- Consider rate limiting for high-volume scenarios

## Integration Points
- Survey completion in `app.py` (line ~890)
- Manual testing via PostbackManager UI
- API endpoints for programmatic access
- Database logging for monitoring and debugging
