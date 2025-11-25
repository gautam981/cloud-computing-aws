# AWS Setup Checklist

## ✅ Quick Setup Checklist

### Phase 1: DynamoDB (5 minutes)
- [ ] Create `ChatConnections` table (Partition key: `connectionId` - String)
- [ ] Create `ChatRooms` table (Partition key: `roomId` - String)
- [ ] Create `ChatMessages` table (Partition key: `roomId` - String, Sort key: `timestamp` - Number)
- [ ] Copy all three table ARNs

### Phase 2: IAM Role (10 minutes)
- [ ] Create IAM role: `ChatAppLambdaExecutionRole`
- [ ] Attach `AWSLambdaBasicExecutionRole` policy
- [ ] Create custom policy `ChatAppLambdaPolicy` from `infrastructure/lambda-iam-policy.json`
- [ ] Update policy with your REGION, ACCOUNT_ID (API_ID comes later)
- [ ] Attach custom policy to role
- [ ] Copy Role ARN

### Phase 3: Lambda Functions (20 minutes)
Create 6 Lambda functions with Python 3.11:

- [ ] `ChatApp-ConnectHandler`
  - Environment vars: `CONNECTIONS_TABLE=ChatConnections`
  - Timeout: 30 seconds
  
- [ ] `ChatApp-DisconnectHandler`
  - Environment vars: `CONNECTIONS_TABLE=ChatConnections`
  - Timeout: 30 seconds
  
- [ ] `ChatApp-CreateRoomHandler`
  - Environment vars: `CONNECTIONS_TABLE=ChatConnections`, `ROOMS_TABLE=ChatRooms`
  - Timeout: 30 seconds
  
- [ ] `ChatApp-JoinRoomHandler`
  - Environment vars: `CONNECTIONS_TABLE=ChatConnections`, `ROOMS_TABLE=ChatRooms`
  - Timeout: 30 seconds
  
- [ ] `ChatApp-SendMessageHandler`
  - Environment vars: `CONNECTIONS_TABLE=ChatConnections`, `ROOMS_TABLE=ChatRooms`, `MESSAGES_TABLE=ChatMessages`
  - Timeout: 30 seconds
  
- [ ] `ChatApp-GetRoomMembersHandler`
  - Environment vars: `CONNECTIONS_TABLE=ChatConnections`, `ROOMS_TABLE=ChatRooms`
  - Timeout: 30 seconds

### Phase 4: API Gateway WebSocket (15 minutes)
- [ ] Create WebSocket API: `ChatAppWebSocket`
- [ ] Route selection expression: `$request.body.action`
- [ ] Add routes and integrations:
  - [ ] `$connect` → ChatApp-ConnectHandler
  - [ ] `$disconnect` → ChatApp-DisconnectHandler
  - [ ] `$default` → ChatApp-DefaultHandler (create simple error handler)
  - [ ] `createRoom` → ChatApp-CreateRoomHandler
  - [ ] `joinRoom` → ChatApp-JoinRoomHandler
  - [ ] `sendMessage` → ChatApp-SendMessageHandler
  - [ ] `getMembers` → ChatApp-GetRoomMembersHandler
- [ ] Deploy API to `production` stage
- [ ] Copy WebSocket URL (wss://...)
- [ ] Copy API ID from URL
- [ ] Update IAM policy with API ID

### Phase 5: S3 Frontend (10 minutes)
- [ ] Create S3 bucket (unique name, e.g., `your-chat-app-frontend-12345`)
- [ ] Uncheck "Block all public access"
- [ ] Enable static website hosting
  - Index document: `index.html`
  - Error document: `index.html`
- [ ] Copy website endpoint URL
- [ ] Add bucket policy from `infrastructure/s3-bucket-policy.json`
- [ ] Update bucket name in policy

### Phase 6: Frontend Configuration (5 minutes)
- [ ] Update `frontend/app.js`:
  - Replace `WS_ENDPOINT` with your WebSocket URL
- [ ] Upload to S3:
  - [ ] `index.html`
  - [ ] `style.css`
  - [ ] `app.js`

### Phase 7: Testing (10 minutes)
- [ ] Open S3 website URL in browser
- [ ] Test connection with username
- [ ] Create a room and note Room ID
- [ ] Open second browser/incognito window
- [ ] Join room with different username
- [ ] Admin approves join request
- [ ] Test messaging between users
- [ ] Test "View Members" functionality

---

## 📝 Information You'll Need to Collect

| Item | Where to Find It | Example | Your Value |
|------|-----------------|---------|------------|
| AWS Region | AWS Console top-right | us-east-1 | __________ |
| AWS Account ID | AWS Console → Account | 123456789012 | __________ |
| ChatConnections ARN | DynamoDB → Table details | arn:aws:dynamodb:... | __________ |
| ChatRooms ARN | DynamoDB → Table details | arn:aws:dynamodb:... | __________ |
| ChatMessages ARN | DynamoDB → Table details | arn:aws:dynamodb:... | __________ |
| Lambda Role ARN | IAM → Roles | arn:aws:iam:... | __________ |
| API Gateway ID | API Gateway → API details | abc123xyz | __________ |
| WebSocket URL | API Gateway after deploy | wss://abc123xyz... | __________ |
| S3 Bucket Name | S3 → Bucket name | your-chat-app-12345 | __________ |
| S3 Website URL | S3 → Properties → Static hosting | http://bucket.s3... | __________ |

---

## 🔧 Commands for AWS CLI (Optional)

If you prefer using AWS CLI, here are helpful commands:

### Get Account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

### List DynamoDB Tables:
```bash
aws dynamodb list-tables
```

### List Lambda Functions:
```bash
aws lambda list-functions --query 'Functions[*].FunctionName'
```

### List API Gateway APIs:
```bash
aws apigatewayv2 get-apis
```

### Upload Files to S3:
```bash
aws s3 cp frontend/ s3://your-bucket-name/ --recursive
```

---

## ⏱️ Estimated Time Breakdown

- **Total Setup Time**: ~75 minutes
- DynamoDB: 5 min
- IAM: 10 min
- Lambda: 20 min
- API Gateway: 15 min
- S3: 10 min
- Frontend Config: 5 min
- Testing: 10 min

---

## 🚨 Common Mistakes to Avoid

1. ❌ Forgetting to deploy API Gateway to production stage
2. ❌ Not updating the WebSocket URL in app.js
3. ❌ Mismatched table names in environment variables
4. ❌ Wrong IAM permissions (especially API Gateway execute-api)
5. ❌ Lambda timeout too short (must be at least 30 seconds)
6. ❌ S3 bucket not public (static website won't be accessible)
7. ❌ Not refreshing browser after uploading new app.js

---

## 🎯 Success Criteria

You'll know it's working when:
- ✅ You can connect with a username
- ✅ You can create a room and see the Room ID
- ✅ Second user can request to join
- ✅ Admin sees join request in "View Members"
- ✅ Admin can approve the request
- ✅ Both users can send and receive messages
- ✅ Participant list shows both users
- ✅ No errors in browser console

---

## 📞 Need Help?

Check CloudWatch Logs:
1. Go to CloudWatch → Log groups
2. Find `/aws/lambda/ChatApp-[FunctionName]`
3. Look for error messages

Test Lambda Functions:
1. Go to Lambda → Select function
2. Click Test tab
3. Create test event
4. Check results

---

**Good luck with your setup! 🚀**
