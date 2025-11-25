# Voice Chat Troubleshooting Guide

## Issue: "Creating voice room..." stuck with no response

**Symptom:** Frontend sends `createVoiceRoom` message successfully, but never receives a response.

**Root Cause:** The Lambda function is failing silently before it can send a response back.

---

## Step-by-Step Diagnosis

### 1. Verify Lambda Environment Variables

Go to **AWS Console** → **Lambda** → **CreateVoiceRoomHandler** → **Configuration** → **Environment variables**

Required variables:
- `CONNECTIONS_TABLE` = `ChatConnections` (or your table name)
- `ROOMS_TABLE` = `ChatRooms` (or your table name)
- `VOICE_ROOMS_TABLE` = `VoiceRooms`

**Action:** If any are missing, add them and click **Save**.

---

### 2. Verify Lambda IAM Permissions

Go to **AWS Console** → **Lambda** → **CreateVoiceRoomHandler** → **Configuration** → **Permissions**

Click on the **Execution role** link, then check if the role has these policies:

#### Required Permissions:

**DynamoDB:**
```json
{
    "Effect": "Allow",
    "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Scan"
    ],
    "Resource": [
        "arn:aws:dynamodb:*:*:table/ChatConnections",
        "arn:aws:dynamodb:*:*:table/ChatRooms",
        "arn:aws:dynamodb:*:*:table/VoiceRooms"
    ]
}
```

**Kinesis Video Streams (KVS):**
```json
{
    "Effect": "Allow",
    "Action": [
        "kinesisvideo:CreateSignalingChannel",
        "kinesisvideo:DescribeSignalingChannel",
        "kinesisvideo:DeleteSignalingChannel",
        "kinesisvideo:GetSignalingChannelEndpoint",
        "kinesisvideo:TagResource"
    ],
    "Resource": "*"
}
```

**API Gateway (for WebSocket responses):**
```json
{
    "Effect": "Allow",
    "Action": [
        "execute-api:ManageConnections",
        "execute-api:Invoke"
    ],
    "Resource": "arn:aws:execute-api:*:*:*/@connections/*"
}
```

**Action:** If any permissions are missing, add them to the Lambda execution role.

---

### 3. Check Lambda Timeout

Go to **AWS Console** → **Lambda** → **CreateVoiceRoomHandler** → **Configuration** → **General configuration**

- **Timeout:** Should be at least **30 seconds** (creating KVS channels can take time)
- **Memory:** At least **256 MB**

**Action:** If timeout is less than 30 seconds, increase it.

---

### 4. Verify API Gateway Route Configuration

Go to **AWS Console** → **API Gateway** → Your WebSocket API → **Routes**

You should see:
- Route key: `createVoiceRoom`
- Integration: `CreateVoiceRoomHandler`
- Status: **Attached** ✓

**Click on the route** and verify:
- Integration type: **Lambda Function**
- Lambda function: `CreateVoiceRoomHandler` (should show the ARN)
- Integration response: Not required for WebSocket

**Action:** If the route exists but has no integration, click **Attach integration** and select the Lambda.

---

### 5. Deploy the API

Even if routes are configured, **you must deploy** for changes to take effect.

Go to **API Gateway** → Your WebSocket API → **Deployments**

Click **Deploy API**:
- Stage: `production` (or your stage name)
- Click **Deploy**

**Action:** Always deploy after making any route or integration changes.

---

### 6. Check CloudWatch Logs

Go to **AWS Console** → **CloudWatch** → **Log groups** → `/aws/lambda/CreateVoiceRoomHandler`

Or use AWS CLI:
```powershell
aws logs tail /aws/lambda/CreateVoiceRoomHandler --follow --format short
```

**What to look for:**

- **No logs at all** → Lambda is not being invoked (route issue)
- **"Connection not found"** → Database issue
- **"Room not found"** → Room doesn't exist or wrong table name
- **"Not authorized"** → User not approved in the room
- **"AccessDeniedException"** → Missing IAM permissions for KVS
- **"ResourceNotFoundException"** → DynamoDB table doesn't exist
- **Any Python error** → That's your issue!

---

### 7. Test Lambda Directly

Go to **AWS Console** → **Lambda** → **CreateVoiceRoomHandler** → **Test**

Create a test event with this payload:
```json
{
  "requestContext": {
    "connectionId": "test-connection-123",
    "domainName": "yhzb8n8yx4.execute-api.us-east-1.amazonaws.com",
    "stage": "production"
  },
  "body": "{\"action\":\"createVoiceRoom\",\"roomId\":\"test-room-id\"}"
}
```

Click **Test** and check:
- **Execution result:** Should show "succeeded"
- **Logs:** Will show detailed error messages
- **Response:** Should return `{"statusCode": 200, ...}` or an error

---

## Quick Fix Checklist

1. ✅ Environment variables set correctly
2. ✅ Lambda has DynamoDB permissions
3. ✅ Lambda has KVS permissions  
4. ✅ Lambda has API Gateway ManageConnections permission
5. ✅ Lambda timeout is 30+ seconds
6. ✅ Route `createVoiceRoom` exists in API Gateway
7. ✅ Route is integrated with CreateVoiceRoomHandler Lambda
8. ✅ API Gateway deployed to production stage
9. ✅ VoiceRooms DynamoDB table exists
10. ✅ Lambda code is uploaded (not showing old version)

---

## Still Not Working?

### Enable Detailed Lambda Logging

Add this to the start of `create_voice_room_handler.py`:

```python
def lambda_handler(event, context):
    import json
    print("=" * 50)
    print("FULL EVENT:", json.dumps(event, indent=2))
    print("=" * 50)
    # ... rest of code
```

Redeploy the Lambda and check logs again.

### Check API Gateway Logs

Go to **API Gateway** → Your WebSocket API → **Stages** → `production` → **Logs/Tracing**

Enable:
- ✅ CloudWatch Logs
- ✅ Full request and response logging
- ✅ Detailed CloudWatch Metrics

This will show if messages are even reaching the Lambda.

---

## Common Solutions

### Solution 1: Missing Environment Variables
```powershell
aws lambda update-function-configuration `
  --function-name CreateVoiceRoomHandler `
  --environment "Variables={CONNECTIONS_TABLE=ChatConnections,ROOMS_TABLE=ChatRooms,VOICE_ROOMS_TABLE=VoiceRooms}"
```

### Solution 2: Add KVS Permissions
Use the IAM policy from `kvs-iam-policy.json` in the repo.

### Solution 3: Increase Timeout
```powershell
aws lambda update-function-configuration `
  --function-name CreateVoiceRoomHandler `
  --timeout 30
```

### Solution 4: Redeploy API Gateway
```powershell
aws apigatewayv2 create-deployment `
  --api-id YOUR_API_ID `
  --stage-name production
```

---

## After Fixing

1. **Refresh the frontend** (hard refresh: Ctrl+Shift+R)
2. **Try creating a voice room again**
3. **Check the console** - you should see the timeout message go away and see logs about receiving a response
4. **Check CloudWatch logs** to confirm the Lambda executed successfully
