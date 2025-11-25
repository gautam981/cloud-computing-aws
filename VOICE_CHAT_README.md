# 🎤 Voice Chat Feature - Quick Start

## What's Been Added

Your AWS group chat app now has **real-time voice chat** using Amazon Kinesis Video Streams with WebRTC!

### Features:
✅ **Start Voice Chat** - Any approved room member can start voice
✅ **Join Voice** - All approved members can join the voice session
✅ **Mute/Unmute** - Control your microphone
✅ **End Voice** - Room creator can end voice session for everyone
✅ **Visual Indicators** - See who's in voice chat
✅ **Concurrent Chat** - Voice and text chat work simultaneously

## Files Created

### Backend (Lambda Functions)
```
aws-chat-app/lambda-functions/
├── create_voice_room_handler.py      (Creates KVS signaling channel)
├── get_voice_credentials_handler.py  (Provides WebRTC credentials)
└── end_voice_room_handler.py         (Ends voice session)
```

### IAM Policies
```
aws-chat-app/
├── kvs-iam-policy.json                    (Lambda KVS permissions)
├── kvs-access-role-trust-policy.json      (KVSAccessRole trust policy)
└── kvs-access-role-permissions.json       (KVS WebRTC permissions)
```

### Frontend (Updated)
```
aws-chat-app/frontend/
├── index.html    (Added voice controls UI)
├── style.css     (Added voice styling)
└── app.js        (Added WebRTC implementation)
```

### Documentation
```
aws-chat-app/
├── VOICE_CHAT_SETUP.md              (Detailed setup guide)
├── VOICE_CHAT_CHECKLIST.md          (Step-by-step checklist)
└── lambda-functions/
    └── LAMBDA_DEPLOYMENT.md         (Lambda packaging guide)
```

## Quick Setup (5 Steps)

### 1️⃣ Create DynamoDB Table
```bash
aws dynamodb create-table \
  --table-name VoiceRooms \
  --attribute-definitions AttributeName=voiceRoomId,AttributeType=S \
  --key-schema AttributeName=voiceRoomId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2️⃣ Create IAM Role (KVSAccessRole)
1. Go to IAM → Roles → Create role
2. Use trust policy from `kvs-access-role-trust-policy.json`
3. Add permissions from `kvs-access-role-permissions.json`
4. **Copy the ARN** (you'll need it!)

### 3️⃣ Update Lambda Execution Role
Add permissions from `kvs-iam-policy.json` to `ChatAppLambdaExecutionRole`

### 4️⃣ Deploy Lambda Functions
```powershell
# Package functions
cd "aws-chat-app\lambda-functions"
Compress-Archive -Path create_voice_room_handler.py -DestinationPath create_voice_room_handler.zip -Force
Compress-Archive -Path get_voice_credentials_handler.py -DestinationPath get_voice_credentials_handler.zip -Force
Compress-Archive -Path end_voice_room_handler.py -DestinationPath end_voice_room_handler.zip -Force
```

Then upload to Lambda console and configure:
- **CreateVoiceRoomHandler** - Env vars: CONNECTIONS_TABLE, ROOMS_TABLE, VOICE_ROOMS_TABLE
- **GetVoiceCredentialsHandler** - Env vars: CONNECTIONS_TABLE, VOICE_ROOMS_TABLE, KVS_ROLE_ARN
- **EndVoiceRoomHandler** - Env vars: CONNECTIONS_TABLE, ROOMS_TABLE, VOICE_ROOMS_TABLE

### 5️⃣ Update API Gateway & Frontend
1. Add 3 routes in API Gateway: `createVoiceRoom`, `getVoiceCredentials`, `endVoiceRoom`
2. Deploy API to production
3. Upload updated `index.html`, `style.css`, `app.js` to S3
4. Update `AWS_REGION` in `app.js` (line 14)

## Testing Voice Chat

1. **Open 2 browsers** (use incognito mode)
2. **Connect as different users** (e.g., "Alice" and "Bob")
3. **Create room** with Alice (becomes admin)
4. **Join room** with Bob
5. **Approve Bob** (Alice clicks approve in members list)
6. **Start voice** (Alice clicks "🎤 Start Voice Chat")
7. **Grant mic permission** when browser asks
8. **Join voice** (Bob clicks "🎤 Join Voice")
9. **Test audio** - speak and verify both hear each other
10. **Test mute** - click "🔇 Mute" button
11. **End voice** - Alice clicks "❌ End Voice"

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │  HTTP   │      S3      │  WSS    │API Gateway  │
│  (WebRTC)   │────────>│   Frontend   │<────────│  WebSocket  │
└─────────────┘         └──────────────┘         └─────────────┘
      │                                                  │
      │ P2P Audio                                       │ Lambda
      │                                                  ▼
      │                                           ┌──────────────┐
      │ Signaling via                             │  DynamoDB    │
      │ KVS WebRTC                                │   Tables     │
      │                                           └──────────────┘
      │
      ▼
┌─────────────┐
│  Kinesis    │
│   Video     │
│  Streams    │
│ (Signaling) │
└─────────────┘
```

**Flow:**
1. User clicks "Start Voice" → Lambda creates KVS signaling channel
2. Lambda returns temporary AWS credentials
3. Browser connects to KVS WebRTC signaling
4. Browsers exchange SDP offers/answers via KVS
5. WebRTC establishes **peer-to-peer** audio connection
6. Audio streams **directly between browsers** (not via servers!)

## Cost Estimate

### Per Voice Session (1 hour, 10 users):
- **Kinesis Video Streams**: $0.027 (signaling minutes)
- **DynamoDB**: $0.000001 (minimal writes/reads)
- **Lambda**: $0.002 (3 invocations per user)
- **Data Transfer**: $0.01 (TURN relay, rarely used)

**Total per session: ~$0.04** 💰

### Monthly (assuming 100 sessions):
- **Total: ~$4.00/month**

## Troubleshooting

### No audio?
```javascript
// Check browser console (F12) for:
✓ "Microphone access granted"
✓ "Signaling client connected"
✓ "Peer connection state: connected"
✓ "Received remote audio track"
```

### Lambda errors?
```bash
# Check CloudWatch logs:
aws logs tail /aws/lambda/CreateVoiceRoomHandler --follow
```

### Voice room not creating?
- Verify IAM role has `kinesisvideo:CreateSignalingChannel` permission
- Check `KVS_ROLE_ARN` environment variable is set correctly
- Ensure VoiceRooms DynamoDB table exists

### Can't hear other person?
- Check volume levels (OS and browser)
- Verify microphone is not muted
- Try different browser (Chrome/Firefox recommended)
- Check firewall settings (allow WebRTC)

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 74+ | ✅ Best | Recommended |
| Firefox 66+ | ✅ Great | Recommended |
| Edge 79+ | ✅ Good | Chromium-based |
| Safari 14.1+ | ⚠️ Limited | May have issues |
| Mobile Chrome | ✅ Works | Android only |
| Mobile Safari | ⚠️ Limited | iOS restrictions |

## Security

- ✅ **Temporary credentials** expire after 1 hour
- ✅ **Room authorization** - only approved members join
- ✅ **Master control** - only room creator can end session
- ✅ **P2P encryption** - WebRTC uses DTLS/SRTP
- ✅ **AWS managed** - KVS handles all signaling security

## Next Steps

Want to enhance voice chat?

- 📹 **Add video**: Enable camera in WebRTC
- 📺 **Screen sharing**: Add `getDisplayMedia()`
- 🎙️ **Voice indicators**: Show who's speaking (audio level)
- 📼 **Recording**: Save sessions to S3
- 🔄 **Auto-reconnect**: Handle network drops
- 📱 **Mobile optimization**: Better mobile UX

## Support & Documentation

- **Detailed Setup**: `VOICE_CHAT_SETUP.md`
- **Step-by-step**: `VOICE_CHAT_CHECKLIST.md`
- **Lambda Deploy**: `lambda-functions/LAMBDA_DEPLOYMENT.md`
- **AWS KVS Docs**: https://docs.aws.amazon.com/kinesisvideostreams-webrtc-dg/

## Environment Variables Reference

Update these in `app.js`:
```javascript
const AWS_REGION = 'us-east-1';  // Your AWS region
const WS_ENDPOINT = "wss://YOUR_API_ID.execute-api.region.amazonaws.com/production";
```

Update these in Lambda functions:
```
CONNECTIONS_TABLE = ChatConnections
ROOMS_TABLE = ChatRooms
VOICE_ROOMS_TABLE = VoiceRooms
KVS_ROLE_ARN = arn:aws:iam::ACCOUNT_ID:role/KVSAccessRole
```

---

## 🎉 You're Ready!

Your chat app now has **production-ready voice chat**!

**Questions?** Check the detailed guides in the documentation files.

**Issues?** Check CloudWatch logs and browser console.

**Happy chatting! 🎤💬**
