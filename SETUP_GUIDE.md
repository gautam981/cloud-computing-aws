# AWS Group Chat Application - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Create DynamoDB Tables](#step-1-create-dynamodb-tables)
3. [Step 2: Create IAM Role for Lambda](#step-2-create-iam-role-for-lambda)
4. [Step 3: Create Lambda Functions](#step-3-create-lambda-functions)
5. [Step 4: Create API Gateway WebSocket API](#step-4-create-api-gateway-websocket-api)
6. [Step 5: Configure S3 for Frontend Hosting](#step-5-configure-s3-for-frontend-hosting)
7. [Step 6: Update Frontend Configuration](#step-6-update-frontend-configuration)
8. [Step 7: Testing](#step-7-testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:
- An AWS Account
- AWS CLI installed and configured (optional but helpful)
- Basic understanding of AWS services
- A text editor

---

## Step 1: Create DynamoDB Tables

### 1.1 Create ChatConnections Table
1. Go to **AWS Console** → **DynamoDB**
2. Click **Create table**
3. Configure:
   - **Table name**: `ChatConnections`
   - **Partition key**: `connectionId` (String)
4. Leave other settings as default
5. Click **Create table**

### 1.2 Create ChatRooms Table
1. Click **Create table**
2. Configure:
   - **Table name**: `ChatRooms`
   - **Partition key**: `roomId` (String)
3. Click **Create table**

### 1.3 Create ChatMessages Table
1. Click **Create table**
2. Configure:
   - **Table name**: `ChatMessages`
   - **Partition key**: `roomId` (String)
   - **Sort key**: `timestamp` (Number)
3. Click **Create table**

### 1.4 Note Your Table ARNs
For each table, click on it and copy the ARN (Amazon Resource Name) from the table details. You'll need these for the IAM policy.

Example ARN format:
```
arn:aws:dynamodb:us-east-1:123456789012:table/ChatConnections
```
Chatconnections - arn:aws:dynamodb:us-east-1:269672238508:table/ChatConnections
ChatMessages - arn:aws:dynamodb:us-east-1:269672238508:table/ChatMessages
ChatRooms - arn:aws:dynamodb:us-east-1:269672238508:table/ChatRooms
---

## Step 2: Create IAM Role for Lambda

### 2.1 Create the Execution Role
1. Go to **IAM** → **Roles** → **Create role**
2. Select **AWS service** → **Lambda**
3. Click **Next**

### 2.2 Attach Basic Lambda Execution Policy
1. Search for and select: `AWSLambdaBasicExecutionRole`
2. Click **Next**

### 2.3 Create Custom Policy for DynamoDB and API Gateway
1. Click **Create policy**
2. Switch to **JSON** tab
3. Copy the content from `infrastructure/lambda-iam-policy.json`
4. **IMPORTANT**: Replace the following placeholders:
   - `YOUR_REGION` (e.g., us-east-1)
   - `YOUR_ACCOUNT_ID` (your 12-digit AWS account ID)
   - `YOUR_API_ID` (you'll get this after creating API Gateway, come back to update)
5. Name the policy: `ChatAppLambdaPolicy`
6. Click **Create policy**

### 2.4 Attach Custom Policy to Role
1. Return to the role creation tab
2. Refresh the policy list
3. Search for and select `ChatAppLambdaPolicy`
4. Click **Next**
5. **Role name**: `ChatAppLambdaExecutionRole`
6. Click **Create role**

### 2.5 Copy Role ARN
After creation, copy the Role ARN. You'll need it for Lambda functions.
ARN - arn:aws:iam::269672238508:role/ChatAppLambdaExecutionRole
---

## Step 3: Create Lambda Functions

You need to create **6 Lambda functions**. For each function:

### General Steps for Each Function:
1. Go to **Lambda** → **Create function**
2. Select **Author from scratch**
3. Configure:
   - **Function name**: [See names below]
   - **Runtime**: Python 3.11
   - **Execution role**: Use an existing role → Select `ChatAppLambdaExecutionRole`
4. Click **Create function**

### 3.1 Function: ConnectHandler
- **Name**: `ChatApp-ConnectHandler`
- **Code**: Copy from `lambda-functions/connect_handler.py`
- **Environment variables**:
  - `CONNECTIONS_TABLE` = `ChatConnections`

### 3.2 Function: DisconnectHandler
- **Name**: `ChatApp-DisconnectHandler`
- **Code**: Copy from `lambda-functions/disconnect_handler.py`
- **Environment variables** :
  - `CONNECTIONS_TABLE` = `ChatConnections`

### 3.3 Function: CreateRoomHandler
- **Name**: `ChatApp-CreateRoomHandler`
- **Code**: Copy from `lambda-functions/create_room_handler.py`
- **Environment variables**:
  - `CONNECTIONS_TABLE` = `ChatConnections`
  - `ROOMS_TABLE` = `ChatRooms`

### 3.4 Function: JoinRoomHandler
- **Name**: `ChatApp-JoinRoomHandler`
- **Code**: Copy from `lambda-functions/join_room_handler.py`
- **Environment variables**:
  - `CONNECTIONS_TABLE` = `ChatConnections`
  - `ROOMS_TABLE` = `ChatRooms`

### 3.5 Function: SendMessageHandler
- **Name**: `ChatApp-SendMessageHandler`
- **Code**: Copy from `lambda-functions/send_message_handler.py`
- **Environment variables**:
  - `CONNECTIONS_TABLE` = `ChatConnections`
  - `ROOMS_TABLE` = `ChatRooms`
  - `MESSAGES_TABLE` = `ChatMessages`

### 3.6 Function: GetRoomMembersHandler
- **Name**: `ChatApp-GetRoomMembersHandler`
- **Code**: Copy from `lambda-functions/get_room_members_handler.py`
- **Environment variables**:
  - `CONNECTIONS_TABLE` = `ChatConnections`
  - `ROOMS_TABLE` = `ChatRooms`

### 3.7 Configure Each Function
For each function:
1. Go to **Configuration** → **General configuration**
2. Click **Edit**
3. Set **Timeout** to `30 seconds`
4. Click **Save**

---

## Step 4: Create API Gateway WebSocket API

### 4.1 Create WebSocket API
1. Go to **API Gateway** → **Create API**
2. Select **WebSocket API** → **Build**
3. Configure:
   - **API name**: `ChatAppWebSocket`
   - **Route selection expression**: `$request.body.action`
4. Click **Next**

### 4.2 Add Routes
You need to add 7 routes. Click **Add route** for each:

| Route Key | Lambda Function |
|-----------|----------------|
| `$connect` | ChatApp-ConnectHandler |
| `$disconnect` | ChatApp-DisconnectHandler |
| `$default` | (Create a simple error handler) |
| `createRoom` | ChatApp-CreateRoomHandler |
| `joinRoom` | ChatApp-JoinRoomHandler |
| `sendMessage` | ChatApp-SendMessageHandler |
| `getMembers` | ChatApp-GetRoomMembersHandler |

### 4.3 Create $default Handler (Error Handler)
1. Create a new Lambda function: `ChatApp-DefaultHandler`
2. Code:
```python
def lambda_handler(event, context):
    return {
        'statusCode': 400,
        'body': 'Unknown action'
    }
```
3. Attach it to the `$default` route

### 4.4 Configure Route Integrations
For each route:
1. Select the route
2. Click **Integration Request**
3. Select **Lambda Function**
4. Choose the corresponding function
5. Click **Save**

### 4.5 Deploy API
1. Click **Actions** → **Deploy API**
2. **Stage name**: `production`
3. Click **Deploy**

### 4.6 Copy WebSocket URL
After deployment, you'll see a **WebSocket URL** like:
```
wss://abc123xyz.execute-api.us-east-1.amazonaws.com/production
```
**SAVE THIS URL** - you'll need it for the frontend!
wss://yhzb8n8yx4.execute-api.us-east-1.amazonaws.com/production/
### 4.7 Update IAM Policy
1. Copy your **API ID** (the `abc123xyz` part from the URL)
2. Go back to **IAM** → **Policies** → `ChatAppLambdaPolicy`
3. Edit the policy and replace `YOUR_API_ID` with your actual API ID
4. Save changes

---

## Step 5: Configure S3 for Frontend Hosting

### 5.1 Create S3 Bucket
1. Go to **S3** → **Create bucket**
2. **Bucket name**: `your-chat-app-frontend` (must be globally unique)
3. **Region**: Same as your Lambda functions
4. **Uncheck** "Block all public access"
5. Acknowledge the warning
6. Click **Create bucket**

### 5.2 Enable Static Website Hosting
1. Click on your bucket
2. Go to **Properties**
3. Scroll to **Static website hosting**
4. Click **Edit**
5. Enable static website hosting
6. **Index document**: `index.html`
7. **Error document**: `index.html`
8. Click **Save changes**
9. **Copy the website endpoint URL** (you'll use this to access your app)
http://your-chat-app-frontend.s3-website-us-east-1.amazonaws.com
### 5.3 Add Bucket Policy
1. Go to **Permissions** tab
2. Click **Bucket Policy** → **Edit**
3. Copy the policy from `infrastructure/s3-bucket-policy.json`
4. **Replace** `your-chat-app-frontend` with your actual bucket name
5. Click **Save changes**

---

## Step 6: Update Frontend Configuration

### 6.1 Update WebSocket Endpoint
1. Open `frontend/app.js`
2. Find the line:
```javascript
const WS_ENDPOINT = 'wss://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/production';
```
3. Replace with your actual WebSocket URL from Step 4.6

### 6.2 Upload Files to S3
1. Go to your S3 bucket
2. Click **Upload**
3. Drag and drop these files:
   - `frontend/index.html`
   - `frontend/style.css`
   - `frontend/app.js`
4. Click **Upload**

---

## Step 7: Testing

### 7.1 Access Your Application
1. Open the S3 website endpoint URL in your browser
2. You should see the chat login screen

### 7.2 Test Basic Functionality
1. **Enter a username** and click Connect
2. **Create a room** with a name
3. Copy the Room ID that appears

### 7.3 Test Admin Controls
1. Open a **second browser** or **incognito window**
2. Enter a different username and connect
3. **Join the room** using the Room ID
4. In the **first browser** (admin), click "View Members"
5. You should see a pending join request
6. Click **Approve**

### 7.4 Test Messaging
1. Once approved, both users should be able to send messages
2. Messages should appear in both windows in real-time

---

## Troubleshooting

### Common Issues:

#### 1. "Connection error" when trying to connect
- **Check**: Your WebSocket URL in `app.js` is correct
- **Check**: API Gateway is deployed to the `production` stage
- **Check**: Lambda functions have correct IAM role attached

#### 2. Can't create rooms or join
- **Check**: Lambda function environment variables are set correctly
- **Check**: DynamoDB tables exist and names match exactly
- **Check**: IAM policy includes DynamoDB permissions

#### 3. Messages not sending
- **Check**: Users are approved (not pending)
- **Check**: `SendMessageHandler` has all three environment variables
- **Check**: API Gateway has permission to invoke Lambda

#### 4. Admin can't see join requests
- **Check**: Browser console for JavaScript errors
- **Check**: Lambda CloudWatch logs for errors
- **Check**: Room ID is correct in both windows

### How to Check Lambda Logs:
1. Go to **CloudWatch** → **Log groups**
2. Find log group: `/aws/lambda/ChatApp-[FunctionName]`
3. Click on latest log stream
4. Look for error messages

### How to Test Lambda Functions:
1. Go to **Lambda** → Select function
2. Click **Test** tab
3. Create test event with sample data
4. Check execution results

---

## Cost Estimates

With minimal usage (testing):
- **DynamoDB**: ~$0 (Free tier: 25 GB storage, 25 WCU, 25 RCU)
- **Lambda**: ~$0 (Free tier: 1M requests/month)
- **API Gateway**: ~$0 (Free tier: 1M messages/month)
- **S3**: ~$0.01/month (negligible for static files)

**Total estimated monthly cost for light usage: < $1**

---

## Next Steps

Once everything works:
1. Consider adding CloudFront for HTTPS and better performance
2. Add Route 53 for custom domain
3. Implement message history retrieval
4. Add user authentication with Cognito
5. Add room deletion functionality
6. Implement typing indicators

---

## Support

If you encounter issues:
1. Check CloudWatch logs for Lambda functions
2. Verify all ARNs and IDs are correct
3. Ensure IAM permissions are properly configured
4. Test each Lambda function individually

---

**🎉 Congratulations! Your AWS Group Chat App is ready!**
