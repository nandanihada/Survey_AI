# 📊 SENDING SURVEY RESPONSES IN POSTBACKS

## ✅ NOW IMPLEMENTED!

Your postback system now supports **sending actual survey responses** to the creator's postback URL!

## 🎯 TWO METHODS SUPPORTED

### **Method 1: GET Request (Query Parameters)**
```
GET https://your-url.com/postback?transaction_id=123&email=user@email.com&responses=[{"question":"Age","answer":"25"}]
```

### **Method 2: POST Request (JSON Body)** ⭐ RECOMMENDED
```
POST https://your-url.com/postback
Content-Type: application/json

{
  "transaction_id": "123",
  "email": "user@email.com",
  "username": "john_doe",
  "status": "pass",
  "responses": [
    {
      "question": "What is your age?",
      "answer": "25"
    },
    {
      "question": "What is your gender?",
      "answer": "Male"
    }
  ],
  "responses_count": "2",
  "ip_address": "127.0.0.1",
  "click_id": "auto_123456",
  "payout": "0.1",
  "currency": "USD"
}
```

## 📋 CONFIGURATION

### Step 1: Set Your Postback URL in MongoDB

```javascript
db.users.updateOne(
  { email: "your@email.com" },
  { 
    $set: { 
      // Your postback endpoint
      postbackUrl: "https://webhook.site/YOUR-UNIQUE-ID",
      
      // Method: 'GET' or 'POST'
      postbackMethod: "POST",  // ⭐ Use POST for survey responses
      
      // Include survey responses in postback
      includeResponses: true,
      
      // Optional: Custom parameter mappings
      parameterMappings: {
        "transaction_id": "txn_id",
        "email": "user_email",
        "responses": "survey_answers",
        "status": "completion_status"
      }
    } 
  }
)
```

### Step 2: Test with webhook.site

1. Go to: https://webhook.site/
2. Copy your unique URL
3. Update your user in MongoDB with that URL
4. Set `postbackMethod: "POST"`
5. Set `includeResponses: true`
6. Complete a survey
7. Check webhook.site - you'll see the full JSON!

## 📦 DATA SENT IN POSTBACK

### Basic Fields (Always Included):
```javascript
{
  "transaction_id": "unique_response_id",
  "survey_id": "SZ0IG",
  "username": "respondent_name",
  "email": "respondent@email.com",
  "user_id": "creator_user_id",
  "simple_user_id": "152887",
  "session_id": "session_uuid",
  "click_id": "auto_123456",
  "ip_address": "127.0.0.1",
  "payout": "0.1",
  "currency": "USD",
  "status": "pass",  // or "fail"
  "timestamp": "1730000000",
  "responses_count": "3",
  "evaluation_result": "qualified"
}
```

### Survey Responses (When includeResponses: true):
```javascript
{
  // ... basic fields above ...
  
  "responses": [
    {
      "question": "What is your age?",
      "answer": "25",
      "questionId": "q1"
    },
    {
      "question": "What is your gender?",
      "answer": "Male",
      "questionId": "q2"
    },
    {
      "question": "What is your country?",
      "answer": "USA",
      "questionId": "q3"
    }
  ]
}
```

## 🔧 PARAMETER MAPPING

You can customize field names using `parameterMappings`:

### Example 1: Simple Mapping
```javascript
parameterMappings: {
  "transaction_id": "txn",
  "email": "user_email",
  "responses": "answers"
}
```

**Result (POST):**
```json
{
  "txn": "123",
  "user_email": "user@email.com",
  "answers": [...]
}
```

### Example 2: No Mapping (Use Original Names)
```javascript
parameterMappings: {}
```

**Result (POST):**
```json
{
  "transaction_id": "123",
  "email": "user@email.com",
  "responses": [...]
}
```

## 🧪 TESTING

### Test 1: Quick Test with webhook.site

```bash
# 1. Update your user
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { 
      postbackUrl: "https://webhook.site/YOUR-ID",
      postbackMethod: "POST",
      includeResponses: true
  }}
)

# 2. Complete a survey
# 3. Check webhook.site - you'll see the POST request with JSON body!
```

### Test 2: Local Testing

```bash
cd d:\pepeleads\blank\hostslice\Backend

# Start backend
python app.py

# Complete a survey, check logs:
# 🎯 USER-BASED POSTBACK: Sending to survey creator
# 📊 Available data for mapping: ['transaction_id', 'email', 'responses', ...]
# 🚀 Sending POST postback to creator...
# 📦 POST data keys: ['transaction_id', 'email', 'responses', ...]
# ✅ SUCCESS: Postback sent to survey creator
```

## 📝 EXAMPLE POSTBACK RECEIVERS

### Node.js/Express Example:
```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/postback', (req, res) => {
  console.log('📥 Postback received!');
  console.log('Transaction ID:', req.body.transaction_id);
  console.log('Email:', req.body.email);
  console.log('Status:', req.body.status);
  console.log('Survey Responses:', req.body.responses);
  
  // Process the responses
  req.body.responses.forEach((item, index) => {
    console.log(`  Q${index + 1}: ${item.question}`);
    console.log(`  A${index + 1}: ${item.answer}`);
  });
  
  res.status(200).send('OK');
});

app.listen(3000);
```

### Python/Flask Example:
```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/postback', methods=['POST'])
def receive_postback():
    data = request.json
    
    print('📥 Postback received!')
    print(f"Transaction ID: {data.get('transaction_id')}")
    print(f"Email: {data.get('email')}")
    print(f"Status: {data.get('status')}")
    
    # Process survey responses
    responses = data.get('responses', [])
    for i, item in enumerate(responses):
        print(f"  Q{i+1}: {item.get('question')}")
        print(f"  A{i+1}: {item.get('answer')}")
    
    return jsonify({'status': 'success'}), 200

if __name__ == '__main__':
    app.run(port=3000)
```

### PHP Example:
```php
<?php
// Get POST data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

error_log('📥 Postback received!');
error_log('Transaction ID: ' . $data['transaction_id']);
error_log('Email: ' . $data['email']);
error_log('Status: ' . $data['status']);

// Process survey responses
foreach ($data['responses'] as $index => $item) {
    error_log('Q' . ($index + 1) . ': ' . $item['question']);
    error_log('A' . ($index + 1) . ': ' . $item['answer']);
}

http_response_code(200);
echo 'OK';
?>
```

## 🎯 WHAT YOU GET

### For Each Survey Completion:

1. **Basic Metadata:**
   - Transaction ID
   - User info (email, username)
   - Tracking data (click_id, IP, session_id)
   - Payout info
   - Pass/Fail status

2. **Survey Responses:**
   - All questions and answers
   - Question IDs
   - Response count

3. **Evaluation Results:**
   - Pass/fail status
   - Qualification result

## ✅ VERIFICATION CHECKLIST

- [ ] User has `postbackUrl` configured
- [ ] User has `postbackMethod` set to "POST"
- [ ] User has `includeResponses` set to true
- [ ] Survey completed successfully
- [ ] Backend logs show "🚀 Sending POST postback"
- [ ] Backend logs show "📦 POST data keys"
- [ ] Postback receiver gets the JSON data
- [ ] Survey responses are in the data

## 🚀 DEPLOY

Once tested locally:

```bash
cd d:\pepeleads\blank\hostslice

# Commit changes
git add Backend/user_postback_sender.py
git commit -m "Add POST support with survey responses in postbacks"
git push origin main

# Render will auto-deploy
```

---

**Your postback system now sends complete survey response data! 🎉**
