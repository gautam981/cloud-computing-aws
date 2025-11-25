# Voice Chat Setup Guide

This guide will help you add voice chat functionality to your AWS group chat app using Amazon Kinesis Video Streams with WebRTC.

## Prerequisites

- AWS account with access to Kinesis Video Streams
- Existing chat app deployment (DynamoDB, Lambda, API Gateway, S3)
- AWS CLI configured with appropriate credentials

## Step 1: Create DynamoDB VoiceRooms Table

### Using AWS Console:
1. Go to **DynamoDB** → **Tables** → **Create table**
2. Configure:
   - **Table name**: `VoiceRooms`
   - **Partition key**: `voiceRoomId` (String)
   - **Table settings**: On-demand capacity
3. Click **Create table**

### Using AWS CLI:
```bash
aws dynamodb create-table \
    --table-name VoiceRooms \
    --attribute-definitions AttributeName=voiceRoomId,AttributeType=S \
    --key-schema AttributeName=voiceRoomId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1
```

## Step 2: Create IAM Role for KVS Access

### Create KVSAccessRole:

1. Go to **IAM** → **Roles** → **Create role**
2. Select **Custom trust policy** and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com",
        "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ChatAppLambdaExecutionRole"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

3. Click **Next**
4. Name the role: `KVSAccessRole`
5. After creation, click on the role and **Add permissions** → **Create inline policy**
6. Use JSON and paste:

```json
{
  "Version": "2012-10-16",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kinesisvideo:ConnectAsMaster",
        "kinesisvideo:ConnectAsViewer"
      ],
      "Resource": "*"
    }
  ]
}
```

7. Name it `KVSWebRTCAccess` and click **Create policy**

**Important**: Copy the Role ARN, you'll need it later.
Format: `arn:aws:iam::YOUR_ACCOUNT_ID:role/KVSAccessRole`
arn:aws:iam::269672238508:role/KVSAccessRole
## Step 3: Update Existing Lambda Execution Role

Add KVS permissions to your `ChatAppLambdaExecutionRole`:

1. Go to **IAM** → **Roles** → Search for `ChatAppLambdaExecutionRole`
2. Click **Add permissions** → **Create inline policy**
3. Use JSON and paste:

```json
{
  "Version": "2012-10-16",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kinesisvideo:CreateSignalingChannel",
        "kinesisvideo:DeleteSignalingChannel",
        "kinesisvideo:GetSignalingChannelEndpoint",
        "kinesisvideo:DescribeSignalingChannel",
        "kinesisvideo:ListSignalingChannels"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sts:AssumeRole"
      ],
      "Resource": "arn:aws:iam::YOUR_ACCOUNT_ID:role/KVSAccessRole"
    }
  ]
}
```

4. Name it `KinesisVideoStreamsPolicy` and click **Create policy**

## Step 4: Create Lambda Functions

### 4.1 Create CreateVoiceRoomHandler

1. Go to **Lambda** → **Create function**
2. Configure:
   - **Function name**: `CreateVoiceRoomHandler`
   - **Runtime**: Python 3.11
   - **Execution role**: Use existing role `ChatAppLambdaExecutionRole`
3. Click **Create function**
4. Copy the code from `lambda-functions/create_voice_room_handler.py`
5. Add **Environment variables**:
   - `CONNECTIONS_TABLE` = `ChatConnections`
   - `ROOMS_TABLE` = `ChatRooms`
   - `VOICE_ROOMS_TABLE` = `VoiceRooms`
6. Set **Timeout** to 30 seconds
7. Click **Deploy**
  
### 4.2 Create GetVoiceCredentialsHandler

1. **Lambda** → **Create function**
2. Configure:
   - **Function name**: `GetVoiceCredentialsHandler`
   - **Runtime**: Python 3.11
   - **Execution role**: Use existing role `ChatAppLambdaExecutionRole`
3. Copy code from `lambda-functions/get_voice_credentials_handler.py`
4. Add **Environment variables**:
   - `CONNECTIONS_TABLE` = `ChatConnections`
   - `VOICE_ROOMS_TABLE` = `VoiceRooms`
   - `KVS_ROLE_ARN` = `arn:aws:iam::YOUR_ACCOUNT_ID:role/KVSAccessRole`
5. Set **Timeout** to 30 seconds
6. Click **Deploy**

### 4.3 Create EndVoiceRoomHandler

1. **Lambda** → **Create function**
2. Configure:
   - **Function name**: `EndVoiceRoomHandler`
   - **Runtime**: Python 3.11
   - **Execution role**: Use existing role `ChatAppLambdaExecutionRole`
3. Copy code from `lambda-functions/end_voice_room_handler.py`
4. Add **Environment variables**:
   - `CONNECTIONS_TABLE` = `ChatConnections`
   - `ROOMS_TABLE` = `ChatRooms`
   - `VOICE_ROOMS_TABLE` = `VoiceRooms`
5. Set **Timeout** to 30 seconds
6. Click **Deploy**

## Step 5: Update API Gateway Routes

1. Go to **API Gateway** → Select your WebSocket API
2. Go to **Routes** → **Create**
3. Add these three routes:

   **Route 1:**
   - Route key: `createVoiceRoom`
   - Integration: `CreateVoiceRoomHandler`

   **Route 2:**
   - Route key: `getVoiceCredentials`
   - Integration: `GetVoiceCredentialsHandler`

   **Route 3:**
   - Route key: `endVoiceRoom`
   - Integration: `EndVoiceRoomHandler`

4. For each route:
   - Click on the route
   - Click **Attach integration**
   - Select **Lambda function**
   - Choose the corresponding handler
   - Click **Save**

5. **Deploy** the API:
   - Go to **Deployments** → **Deploy API**
   - Stage: `production`

## Step 6: Update Frontend Files

### 6.1 Upload Updated Files to S3

Upload these three files to your S3 bucket (`your-chat-app-frontend`):

1. `frontend/index.html` (includes voice controls and KVS WebRTC SDK)
2. `frontend/style.css` (includes voice UI styling)
3. `frontend/app.js` (includes WebRTC implementation)

### Using AWS Console:
- Go to **S3** → Your bucket → **Upload**
- Select all three files
- Click **Upload**

### Using AWS CLI:
```bash
cd aws-chat-app/frontend
aws s3 cp index.html s3://your-chat-app-frontend/index.html
aws s3 cp style.css s3://your-chat-app-frontend/style.css
aws s3 cp app.js s3://your-chat-app-frontend/app.js
```

### 6.2 Configure AWS Region in app.js

Edit `app.js` line 14 to match your AWS region:
```javascript
const AWS_REGION = 'us-east-1'; // Change to your region
```

## Step 7: Test Voice Chat

### Testing Checklist:

1. **Open two browser windows** in incognito/private mode
2. **Connect as two different users** (e.g., "Alice" and "Bob")
3. **Create a chat room** with one user (becomes admin)
4. **Join the room** with the second user
5. **Approve the join request** (admin)
6. **Start voice chat** (any approved user clicks "Start Voice Chat")
7. **Grant microphone permission** when browser prompts
8. **Join voice** with second user (click "Join Voice")
9. **Test audio** - speak into microphone, verify other user hears you
10. **Test mute/unmute** button
11. **Test ending voice** (admin clicks "End Voice")

### Browser Console Debugging:

Press F12 to open developer tools and check console for:
- ✓ Microphone access granted
- ✓ Signaling client connected
- ✓ SDP offer/answer exchange
- ✓ ICE candidates exchanged
- ✓ Peer connection state: connected
- ✓ Received remote audio track

### Common Issues:

**"Microphone access denied"**
- Grant permission when browser prompts
- Check browser settings → Privacy → Microphone

**"Failed to connect"**
- Verify all Lambda functions are deployed
- Check CloudWatch logs for Lambda errors
- Ensure API Gateway routes are configured
- Verify IAM permissions are correct

**"No audio"**
- Check microphone is not muted in OS settings
- Verify correct audio input device selected
- Check volume levels
- Try different browser (Chrome/Firefox recommended)

**"Voice room creation failed"**
- Check CloudWatch logs for CreateVoiceRoomHandler
- Verify KVS permissions in IAM role
- Ensure VoiceRooms table exists

## Step 8: Verify AWS Resources

### Check DynamoDB:
1. Go to **DynamoDB** → **Tables** → `VoiceRooms`
2. Click **Explore table items**
3. You should see voice room entries with:
   - voiceRoomId
   - chatRoomId
   - signalingChannelARN
   - masterUserId
   - activeParticipants
   - status (active/ended)

### Check Kinesis Video Streams:
1. Go to **Kinesis Video Streams** → **Signaling channels**
2. You should see channels named `voice-{uuid}`
3. After ending voice chat, channels should be deleted

### Check CloudWatch Logs:
1. **CloudWatch** → **Log groups**
2. Check these logs:
   - `/aws/lambda/CreateVoiceRoomHandler`
   - `/aws/lambda/GetVoiceCredentialsHandler`
   - `/aws/lambda/EndVoiceRoomHandler`

## Architecture Overview

```
User Browser (WebRTC)
    ↕ (WebSocket)
API Gateway
    ↕
Lambda Functions
    ↕
DynamoDB + Kinesis Video Streams
    ↕ (Signaling)
Peer-to-Peer Audio Connection
```

**Voice Flow:**
1. User clicks "Start Voice Chat"
2. Lambda creates KVS signaling channel
3. All room participants notified
4. Users request temporary credentials
5. Browsers connect via WebRTC signaling
6. P2P audio connection established
7. Audio streams directly between browsers

## Cost Estimate

### Kinesis Video Streams WebRTC Pricing (us-east-1):
- **Signaling**: $0.045 per 1,000 minutes
- **TURN relay**: $0.20 per GB (only if STUN fails)
- **Storage**: Free (signaling only, no recording)

### Example Cost (10 users, 1 hour voice chat):
- Signaling: 10 users × 60 min = 600 minutes → $0.027
- TURN (typically <1% usage): ~$0.01
- **Total per session: ~$0.04**

### DynamoDB:
- VoiceRooms table: Minimal cost (~$0.000001 per voice session)

## Security Considerations

1. **Temporary Credentials**: Credentials expire after 1 hour
2. **Room Authorization**: Only approved room members can join voice
3. **Master Control**: Only room creator can end voice session
4. **STUN/TURN**: Uses AWS KVS STUN servers for NAT traversal
5. **P2P Audio**: Audio streams directly between browsers (not via servers)

## Troubleshooting Commands

### Check Lambda logs:
```bash
aws logs tail /aws/lambda/CreateVoiceRoomHandler --follow
aws logs tail /aws/lambda/GetVoiceCredentialsHandler --follow
aws logs tail /aws/lambda/EndVoiceRoomHandler --follow
```

### List signaling channels:
```bash
aws kinesisvideo list-signaling-channels --region us-east-1
```

### Query VoiceRooms table:
```bash
aws dynamodb scan --table-name VoiceRooms --region us-east-1
```

### Test Lambda function:
```bash
aws lambda invoke \
  --function-name CreateVoiceRoomHandler \
  --payload '{"requestContext":{"connectionId":"test"},"body":"{\"roomId\":\"test-room\"}"}' \
  response.json
```

## Next Steps

- **Add recording**: Store voice sessions to S3
- **Add video**: Enable video tracks in WebRTC
- **Screen sharing**: Add `getDisplayMedia` for screen sharing
- **Voice indicators**: Show who's speaking (audio level detection)
- **Reconnection**: Auto-reconnect on connection loss
- **Mobile support**: Test on iOS/Android browsers

## Support

For issues:
1. Check CloudWatch logs for errors
2. Verify all IAM permissions
3. Test in Chrome/Firefox (best WebRTC support)
4. Check browser console for JavaScript errors
5. Ensure microphone permissions granted

---

**Congratulations!** Your chat app now has real-time voice functionality! 🎉🎤
