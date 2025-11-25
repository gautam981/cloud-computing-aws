# 🔧 Message Not Sending/Receiving - Troubleshooting Guide

## Problem: Users can join rooms but messages are not being sent or received

This is a common issue with WebSocket communication. Let's diagnose and fix it step by step.

---

## Quick Checks (Do These First!)

### 1. Check Browser Console for Errors
1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for any red error messages
4. Common errors to look for:
   - WebSocket connection errors
   - JSON parse errors
   - "Failed to send message" errors

### 2. Check Network Tab
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Filter by "WS" (WebSocket)
4. You should see:
   - ✅ A WebSocket connection (status 101)
   - ✅ Messages being sent (frames)
5. Click on the WebSocket connection
6. Go to **Messages** tab
7. You should see:
   - Outgoing: Your sent messages
   - Incoming: Messages from server

### 3. Verify WebSocket URL
The WebSocket URL in `app.js` should NOT have a trailing slash!

**❌ WRONG:**
```javascript
const WS_ENDPOINT = "wss://yhzb8n8yx4.execute-api.us-east-1.amazonaws.com/production/";
```

**✅ CORRECT:**
```javascript
const WS_ENDPOINT = "wss://yhzb8n8yx4.execute-api.us-east-1.amazonaws.com/production";
```

**ACTION REQUIRED: Update your app.js and re-upload to S3!**

---

## Step-by-Step Diagnosis

### Step 1: Test Connection Status

Open browser console and check if WebSocket is connected:
```javascript
// In browser console, type:
ws.readyState
```

Expected result:
- `1` = OPEN (connected) ✅
- `0` = CONNECTING
- `2` = CLOSING
- `3` = CLOSED ❌

### Step 2: Check Lambda CloudWatch Logs

#### For SendMessageHandler:
1. Go to **AWS Console** → **CloudWatch** → **Log groups**
2. Find `/aws/lambda/ChatApp-SendMessageHandler`
3. Click on the latest log stream
4. Look for errors:

**Common errors:**

**Error 1: "Not in a room"**
```
{'statusCode': 400, 'body': 'Not in a room'}
```
**Fix**: User's connection doesn't have a roomId. Check if room join succeeded.

**Error 2: "Not authorized"**
```
{'statusCode': 403, 'body': 'Not authorized'}
```
**Fix**: User is not approved. Admin must approve the user first.

**Error 3: KeyError on participants**
```
KeyError: 'Item'
```
**Fix**: Connection or room not found in DynamoDB. Check table data.

**Error 4: GoneException**
```
botocore.exceptions.ClientError: An error occurred (GoneException)
```
**Fix**: Connection ID is stale. User needs to reconnect.

### Step 3: Verify DynamoDB Data

#### Check ChatConnections Table:
1. Go to **DynamoDB** → **Tables** → **ChatConnections**
2. Click **Explore table items**
3. Verify:
   - ✅ Your connectionId exists
   - ✅ `userId` matches your username
   - ✅ `roomId` is set (not null)

#### Check ChatRooms Table:
1. Go to **DynamoDB** → **Tables** → **ChatRooms**
2. Click **Explore table items**
3. Find your room
4. Check `participants` attribute:
   - ✅ Your userId should show `"approved"`
   - ❌ If it shows `"pending"`, admin needs to approve

Example correct data:
```json
{
  "participants": {
    "alice": "approved",
    "bob": "approved"
  }
}
```

### Step 4: Test Lambda Function Directly

1. Go to **Lambda** → **ChatApp-SendMessageHandler**
2. Click **Test** tab
3. Create test event:

```json
{
  "requestContext": {
    "connectionId": "YOUR_CONNECTION_ID",
    "domainName": "yhzb8n8yx4.execute-api.us-east-1.amazonaws.com",
    "stage": "production"
  },
  "body": "{\"action\":\"sendMessage\",\"message\":\"test\"}"
}
```

Replace `YOUR_CONNECTION_ID` with an actual connectionId from DynamoDB.

4. Click **Test**
5. Check results:
   - ✅ Success = Function works
   - ❌ Error = See error details

---

## Common Issues & Solutions

### Issue 1: WebSocket URL Has Trailing Slash
**Symptom**: Messages don't send, no errors in console  
**Fix**: Remove trailing slash from WS_ENDPOINT

**Update app.js:**
```javascript
const WS_ENDPOINT = "wss://yhzb8n8yx4.execute-api.us-east-1.amazonaws.com/production";
```

**Then re-upload to S3!**

### Issue 2: Users Not Approved
**Symptom**: Messages rejected with 403  
**Fix**: Admin must approve users

1. Admin clicks "View Members"
2. See pending requests
3. Click "Approve"

### Issue 3: Connection Lost/Stale
**Symptom**: User was connected but now messages fail  
**Fix**: Refresh the page and reconnect

### Issue 4: API Gateway Not Connected to Lambda
**Symptom**: Nothing happens when sending message  
**Fix**: 
1. Go to **API Gateway** → Your WebSocket API
2. Click **Routes**
3. Click **sendMessage** route
4. Verify integration points to `ChatApp-SendMessageHandler`
5. If not, attach the Lambda function
6. **Deploy API** to production stage

### Issue 5: IAM Permissions Missing
**Symptom**: Lambda logs show permission errors  
**Fix**:
1. Go to **IAM** → **Roles** → `ChatAppLambdaExecutionRole`
2. Verify policies attached:
   - ✅ `AWSLambdaBasicExecutionRole`
   - ✅ `ChatAppLambdaPolicy`
3. Edit `ChatAppLambdaPolicy` and verify:
   - DynamoDB permissions (GetItem, PutItem, Scan, etc.)
   - API Gateway permission (`execute-api:ManageConnections`)

### Issue 6: Lambda Timeout
**Symptom**: Messages sometimes work, sometimes don't  
**Fix**:
1. Go to each Lambda function
2. Configuration → General configuration
3. Set **Timeout** to `30 seconds`

### Issue 7: CORS Issues (Not applicable for WebSocket, but worth checking)
**Note**: WebSocket doesn't use CORS, but if you're seeing CORS errors, you're using HTTP instead of WebSocket.

---

## Debug Commands for Browser Console

### Check WebSocket Connection:
```javascript
console.log('WebSocket State:', ws.readyState);
console.log('Current Room:', currentRoomId);
console.log('Is Admin:', isAdmin);
console.log('User ID:', userId);
```

### Manually Send Test Message:
```javascript
ws.send(JSON.stringify({
    action: 'sendMessage',
    message: 'Manual test message'
}));
```

### Check for Message Handlers:
```javascript
ws.onmessage = (event) => {
    console.log('Received:', event.data);
    const data = JSON.parse(event.data);
    handleMessage(data);
};
```

---

## Verification Checklist

Before you can send messages, verify ALL these are true:

- [ ] WebSocket connection is OPEN (readyState = 1)
- [ ] User is connected with a username
- [ ] User has joined a room (currentRoomId is set)
- [ ] User is APPROVED in the room (not pending)
- [ ] API Gateway route `sendMessage` is linked to Lambda
- [ ] Lambda has correct environment variables
- [ ] Lambda timeout is 30 seconds
- [ ] IAM permissions are correct
- [ ] No errors in CloudWatch logs
- [ ] DynamoDB tables have correct data
- [ ] WebSocket URL has NO trailing slash

---

## Fix The Issue Now!

### Immediate Action Required:

1. **Update app.js** - Remove trailing slash:
```javascript
const WS_ENDPOINT = "wss://yhzb8n8yx4.execute-api.us-east-1.amazonaws.com/production";
```

2. **Re-upload to S3**:
   - Go to S3 bucket
   - Delete old `app.js`
   - Upload new `app.js`
   - **IMPORTANT**: Clear browser cache or hard refresh (Ctrl+Shift+R)

3. **Test Again**:
   - Reconnect both users
   - Join room
   - Admin approves
   - Try sending message

---

## Still Not Working?

### Enable Detailed Logging:

Update `send_message_handler.py` to add debug logging:

```python
def lambda_handler(event, context):
    print(f"Event: {json.dumps(event)}")  # Add this
    
    connection_id = event['requestContext']['connectionId']
    print(f"Connection ID: {connection_id}")  # Add this
    
    body = json.loads(event['body'])
    message_text = body.get('message')
    print(f"Message: {message_text}")  # Add this
    
    # ... rest of code
    
    print(f"Broadcasting to {len(approved_users)} users")  # Add this
    
    for conn in room_connections['Items']:
        if conn['userId'] in approved_users:
            print(f"Sending to {conn['userId']}")  # Add this
            try:
                apigw_client.post_to_connection(
                    ConnectionId=conn['connectionId'],
                    Data=json.dumps(message_payload).encode('utf-8')
                )
                print(f"Success for {conn['userId']}")  # Add this
            except Exception as e:
                print(f'Failed to send to {conn["connectionId"]}: {e}')
```

Then check CloudWatch logs for detailed output.

---

## Expected Behavior

When everything works correctly:

1. **User sends message**
   - Browser sends JSON to WebSocket
   - API Gateway receives it
   - Routes to SendMessageHandler Lambda
   
2. **Lambda processes**
   - Gets sender's connection info
   - Verifies they're in a room
   - Verifies they're approved
   - Stores message in DynamoDB
   - Gets all approved users' connectionIds
   
3. **Lambda broadcasts**
   - Sends message to ALL approved users
   - Each user's browser receives the message
   - `handleMessage()` is called
   - `displayMessage()` adds to chat

4. **User sees message**
   - Message appears in chat window
   - With username, text, and timestamp

---

## Get Help

If still stuck, provide these details:

1. Browser console errors (screenshot)
2. Network tab WebSocket messages (screenshot)
3. CloudWatch logs from SendMessageHandler (copy/paste errors)
4. DynamoDB ChatConnections item (your connection)
5. DynamoDB ChatRooms item (your room's participants)

---

**Most likely fix: Remove the trailing slash from WebSocket URL and re-upload app.js to S3!**
