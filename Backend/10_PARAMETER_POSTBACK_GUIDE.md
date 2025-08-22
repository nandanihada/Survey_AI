# 10-Parameter Postback System Guide

## Overview

The postback system has been upgraded from 6 parameters to **10 fixed parameters** that can be configured and mapped to third-party parameter names in the frontend.

## 10 Fixed Parameters

| Parameter | Description | Example Value | Required |
|-----------|-------------|---------------|----------|
| `click_id` | Unique identifier for the click/conversion event | `click_12345abc` | Yes |
| `payout` | Commission/payout amount earned for the conversion | `5.50` | Yes |
| `currency` | Currency code (USD, EUR, etc.) | `USD` | Yes |
| `offer_id` | Unique identifier for the offer/campaign | `survey_001` | Yes |
| `conversion_status` | Status of the conversion | `confirmed`, `pending`, `reversed` | Yes |
| `transaction_id` | Unique transaction identifier | `txn_987654321` | Yes |
| `sub1` | SubID1 - First level tracking parameter | `user_ref_123` | Optional |
| `sub2` | SubID2 - Second level tracking parameter | `campaign_ref_456` | Optional |
| `event_name` | Name of the conversion event | `survey_completion`, `lead`, `sale` | Yes |
| `timestamp` | Timestamp of when the conversion occurred | `1703123456` (Unix timestamp) | Yes |

## Parameter Details

### 1. click_id
- **Purpose**: Unique identifier for tracking the click that led to conversion
- **Usage**: Links the conversion back to the original traffic source
- **Example**: `click_12345abc`, `tracking_ref_xyz`

### 2. payout
- **Purpose**: The commission or reward amount for the conversion
- **Usage**: Financial tracking and reporting
- **Format**: Decimal number (e.g., `5.50`, `10.00`)

### 3. currency
- **Purpose**: Currency code for the payout amount
- **Usage**: Multi-currency support
- **Format**: 3-letter ISO currency code (e.g., `USD`, `EUR`, `GBP`)

### 4. offer_id
- **Purpose**: Identifies which offer/campaign generated the conversion
- **Usage**: Campaign performance tracking
- **Example**: `survey_001`, `campaign_premium`

### 5. conversion_status
- **Purpose**: Current status of the conversion
- **Usage**: Tracking conversion lifecycle
- **Possible Values**:
  - `confirmed` - Conversion is confirmed and approved
  - `pending` - Conversion is under review
  - `reversed` - Conversion has been reversed/rejected

### 6. transaction_id
- **Purpose**: Unique identifier for the transaction
- **Usage**: Deduplication and transaction tracking
- **Example**: `txn_987654321`, `trans_abc123`

### 7. sub1
- **Purpose**: First level sub-ID for additional tracking
- **Usage**: Custom tracking parameters (e.g., user reference)
- **Example**: `user_ref_123`, `source_google`

### 8. sub2
- **Purpose**: Second level sub-ID for additional tracking
- **Usage**: Secondary tracking parameters (e.g., campaign reference)
- **Example**: `campaign_ref_456`, `medium_cpc`

### 9. event_name
- **Purpose**: Describes the type of conversion event
- **Usage**: Event categorization and reporting
- **Examples**: `survey_completion`, `lead_generation`, `sale`, `signup`

### 10. timestamp
- **Purpose**: When the conversion occurred
- **Usage**: Time-based analytics and reporting
- **Format**: Unix timestamp (seconds since epoch)

## Third-Party Parameter Mapping

### How It Works

The system allows mapping our 10 standard parameters to any third-party parameter names. This is configurable in the frontend UI.

### Example Mappings

#### AdBreak Media
```
click_id → tracking_id
payout → commission
currency → curr
offer_id → campaign_id
conversion_status → status
transaction_id → reference_id
sub1 → subid1
sub2 → subid2
event_name → event_type
timestamp → conversion_time
```

#### SurveyTitans
```
click_id → click_ref
payout → reward_amount
currency → currency_code
offer_id → survey_id
conversion_status → completion_status
transaction_id → titan_txn_id
sub1 → user_ref
sub2 → campaign_ref
event_name → action_type
timestamp → event_timestamp
```

### Configuration Process

1. **Create Postback Share**: Add a new third-party partner
2. **Configure Parameters**: Enable/disable which of the 10 parameters to send
3. **Map Parameter Names**: Map each enabled parameter to the third-party's expected parameter name
4. **Generate URL**: System generates the postback URL with proper parameter mapping
5. **Share URL**: Provide the customized URL to the third party

## Inbound Receiver Updates

The inbound postback receiver (`/postback-handler`) now accepts all 10 parameters:

### Example Inbound URL
```
https://yourserver.com/postback-handler?click_id=abc123&payout=5.50&currency=USD&offer_id=survey001&conversion_status=confirmed&transaction_id=txn123&sub1=user456&sub2=camp789&event_name=conversion&timestamp=1703123456
```

### Backward Compatibility

Legacy parameters are still supported for backward compatibility:
- `sid1` (maps to `sub1`)
- `status` (maps to `conversion_status`) 
- `reward` (maps to `payout`)

## Database Storage

All 10 parameters are stored in the database when a postback is received:

```json
{
  "postback_click_id": "abc123",
  "postback_payout": "5.50",
  "postback_currency": "USD",
  "postback_offer_id": "survey001",
  "postback_conversion_status": "confirmed",
  "postback_transaction_id": "txn123",
  "postback_sub1": "user456",
  "postback_sub2": "camp789",
  "postback_event_name": "conversion",
  "postback_timestamp": "1703123456",
  "postback_received_at": "2024-01-01T12:00:00Z"
}
```

## Frontend Integration

The frontend UI should provide:

1. **Parameter Configuration Panel**
   - Checkboxes to enable/disable each of the 10 parameters
   - Description tooltips for each parameter

2. **Parameter Mapping Interface**
   - Input fields to map standard parameter names to third-party names
   - Preview of the generated URL

3. **URL Generation**
   - Generate customized postback URLs based on configuration
   - Copy-to-clipboard functionality

4. **Testing Tools**
   - Test postback URLs with sample data
   - View postback logs and responses

## Testing

Use the provided test script to verify the system:

```bash
python test_10_parameter_postback.py
```

This tests:
- Inbound postback processing with all 10 parameters
- API configuration endpoints
- Parameter mapping examples

## Migration Notes

- Existing 6-parameter configurations will continue to work
- New configurations default to the 10-parameter system
- Legacy parameter names are maintained for backward compatibility
- Database schema automatically handles both old and new parameter formats
