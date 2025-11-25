# Voice Chat Implementation Checklist

## ✅ AWS Backend Setup

### DynamoDB
- [ ] Create `VoiceRooms` table with `voiceRoomId` as partition key
- [ ] Set to on-demand billing mode
- [ ] Copy table ARN for reference

### IAM Roles
- [ ] Create `KVSAccessRole`
  - [ ] Add trust policy for Lambda
  - [ ] Add KVS permissions (ConnectAsMaster, ConnectAsViewer)
  - [ ] Copy role ARN
- [ ] Update `ChatAppLambdaExecutionRole`
  - [ ] Add KVS management permissions
  - [ ] Add STS AssumeRole permission for KVSAccessRole

### Lambda Functions
- [ ] Create `CreateVoiceRoomHandler`
  - [ ] Upload code
  - [ ] Set env vars: CONNECTIONS_TABLE, ROOMS_TABLE, VOICE_ROOMS_TABLE
  - [ ] Set timeout to 30 seconds
  - [ ] Deploy
- [ ] Create `GetVoiceCredentialsHandler`
  - [ ] Upload code
  - [ ] Set env vars: CONNECTIONS_TABLE, VOICE_ROOMS_TABLE, KVS_ROLE_ARN
  - [ ] Set timeout to 30 seconds
  - [ ] Deploy
- [ ] Create `EndVoiceRoomHandler`
  - [ ] Upload code
  - [ ] Set env vars: CONNECTIONS_TABLE, ROOMS_TABLE, VOICE_ROOMS_TABLE
  - [ ] Set timeout to 30 seconds
  - [ ] Deploy

### API Gateway
- [ ] Add route: `createVoiceRoom` → CreateVoiceRoomHandler
- [ ] Add route: `getVoiceCredentials` → GetVoiceCredentialsHandler
- [ ] Add route: `endVoiceRoom` → EndVoiceRoomHandler
- [ ] Deploy API to `production` stage

## ✅ Frontend Updates

### Files to Upload to S3
- [ ] `index.html` (with voice controls and KVS WebRTC SDK)
- [ ] `style.css` (with voice styling)
- [ ] `app.js` (with WebRTC implementation)
  - [ ] Update AWS_REGION constant to match your region

### Browser Requirements
- [ ] Chrome 74+ or Firefox 66+ (recommended)
- [ ] Microphone access permission
- [ ] HTTPS or localhost (WebRTC requirement)

## ✅ Testing

### Basic Voice Test
- [ ] Open two browser windows (incognito mode)
- [ ] Connect as two different users
- [ ] Create and join chat room
- [ ] Approve join request
- [ ] Click "Start Voice Chat"
- [ ] Grant microphone permission
- [ ] Second user clicks "Join Voice"
- [ ] Verify both users can hear each other
- [ ] Test mute/unmute button
- [ ] Test "End Voice" button

### Debugging
- [ ] Check browser console (F12) for errors
- [ ] Verify CloudWatch logs for Lambda functions
- [ ] Check DynamoDB VoiceRooms table for entries
- [ ] Verify KVS signaling channels are created

## ✅ Configuration Values

### Fill in your values:

**AWS Account ID:** `_________________________________`

**AWS Region:** `_________________________________`

**KVSAccessRole ARN:** 
```
arn:aws:iam::____________:role/KVSAccessRole
```

**VoiceRooms Table ARN:**
```
arn:aws:dynamodb:region:____________:table/VoiceRooms
```

**Lambda Function ARNs:**
```
CreateVoiceRoomHandler: arn:aws:lambda:region:____________:function:CreateVoiceRoomHandler
GetVoiceCredentialsHandler: arn:aws:lambda:region:____________:function:GetVoiceCredentialsHandler
EndVoiceRoomHandler: arn:aws:lambda:region:____________:function:EndVoiceRoomHandler
```

**S3 Bucket:** `_________________________________`

**WebSocket API ID:** `_________________________________`

**WebSocket URL:**
```
wss://____________.execute-api.region.amazonaws.com/production
```

## ✅ Post-Deployment Verification

### DynamoDB Check
- [ ] VoiceRooms table shows voice sessions
- [ ] Status field changes from "active" to "ended"

### Kinesis Video Streams Check
- [ ] Signaling channels appear during voice chat
- [ ] Channels are deleted after ending voice

### CloudWatch Logs Check
- [ ] CreateVoiceRoomHandler logs show channel creation
- [ ] GetVoiceCredentialsHandler logs show credential generation
- [ ] EndVoiceRoomHandler logs show channel deletion
- [ ] No error messages in logs

### Browser Console Check
- [ ] "Microphone access granted" message
- [ ] "Signaling client connected" message
- [ ] "Peer connection state: connected" message
- [ ] "Received remote audio track" message

## 📋 Quick Commands

### Package Lambda functions:
```bash
cd lambda-functions
zip create_voice_room_handler.zip create_voice_room_handler.py
zip get_voice_credentials_handler.zip get_voice_credentials_handler.py
zip end_voice_room_handler.zip end_voice_room_handler.py
```

### Upload to S3:
```bash
cd frontend
aws s3 cp index.html s3://your-bucket/
aws s3 cp style.css s3://your-bucket/
aws s3 cp app.js s3://your-bucket/
```

### Tail Lambda logs:
```bash
aws logs tail /aws/lambda/CreateVoiceRoomHandler --follow
```

### List signaling channels:
```bash
aws kinesisvideo list-signaling-channels
```

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Microphone access denied" | Grant permission in browser settings |
| "Failed to create signaling channel" | Check IAM KVS permissions |
| "Not authorized" error | Verify user is approved in chat room |
| No audio heard | Check mute status, audio devices, volume |
| "Role ARN not found" | Update KVS_ROLE_ARN environment variable |
| WebRTC connection fails | Check STUN server config, firewall settings |

## 📊 Success Criteria

- [ ] Two users can start and join voice chat
- [ ] Audio transmits clearly in both directions
- [ ] Mute/unmute works correctly
- [ ] Voice chat ends cleanly
- [ ] No errors in CloudWatch logs
- [ ] Signaling channels are cleaned up
- [ ] Voice chat works while text messaging continues

---

**Status:** ⬜ Not Started | 🟡 In Progress | ✅ Complete

**Current Step:** _____________________

**Notes:**
