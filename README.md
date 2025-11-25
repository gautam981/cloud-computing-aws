# AWS Group Chat Application

A serverless real-time group chat application built on AWS with admin controls, WebSocket communication, and minimal compute costs.

## 🚀 Features

- **Real-time messaging** via WebSocket API
- **Admin-controlled rooms** - Room creators can approve/reject join requests
- **Participant management** - View all members in a room
- **Serverless architecture** - No servers to manage
- **Cost-effective** - Pay only for what you use (< $1/month for light usage)
- **Scalable** - Built on AWS managed services

## 🏗️ Architecture

- **Frontend**: Static HTML/CSS/JavaScript hosted on S3
- **WebSocket API**: AWS API Gateway WebSocket API
- **Backend Logic**: AWS Lambda (Python 3.11)
- **Database**: Amazon DynamoDB (3 tables)
- **Authentication**: Query parameter-based (can be extended with Cognito)

## 📁 Project Structure

```
aws-chat-app/
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── style.css           # Styling
│   └── app.js              # WebSocket client logic
├── lambda-functions/
│   ├── connect_handler.py  # Handle WebSocket connections
│   ├── disconnect_handler.py
│   ├── create_room_handler.py
│   ├── join_room_handler.py
│   ├── send_message_handler.py
│   └── get_room_members_handler.py
├── infrastructure/
│   ├── lambda-iam-policy.json
│   └── s3-bucket-policy.json
├── SETUP_GUIDE.md          # Detailed setup instructions
└── README.md               # This file
```

## 🛠️ AWS Services Used

1. **Amazon DynamoDB** (3 tables)
   - ChatConnections
   - ChatRooms
   - ChatMessages

2. **AWS Lambda** (6 functions)
   - ConnectHandler
   - DisconnectHandler
   - CreateRoomHandler
   - JoinRoomHandler
   - SendMessageHandler
   - GetRoomMembersHandler

3. **API Gateway WebSocket API**
   - Routes: $connect, $disconnect, createRoom, joinRoom, sendMessage, getMembers

4. **Amazon S3**
   - Static website hosting for frontend

5. **IAM**
   - Execution role for Lambda functions

## 📋 Prerequisites

- AWS Account
- Basic knowledge of AWS Console
- Text editor (VS Code, Notepad++, etc.)

## 🚀 Quick Start

Follow the detailed instructions in [SETUP_GUIDE.md](./SETUP_GUIDE.md)

### High-Level Steps:

1. **Create DynamoDB Tables** (3 tables)
2. **Create IAM Role** with policies for Lambda
3. **Create Lambda Functions** (6 functions with code from `lambda-functions/`)
4. **Create API Gateway WebSocket API** with routes
5. **Create S3 Bucket** and enable static website hosting
6. **Upload Frontend Files** to S3
7. **Update Configuration** (WebSocket URL in app.js)
8. **Test Your Application**

## 💡 How It Works

### User Flow:

1. **Connect**: User enters username and connects via WebSocket
2. **Create/Join Room**: 
   - Create: User becomes admin and gets a Room ID
   - Join: User requests to join with Room ID (requires admin approval)
3. **Admin Controls**: Room admin sees join requests and can approve/reject
4. **Chat**: Approved users can send/receive messages in real-time
5. **View Members**: Anyone can see the participant list

### Technical Flow:

```
Browser → WebSocket → API Gateway → Lambda → DynamoDB
                                       ↓
                                   CloudWatch Logs
```

## 🔒 Security Considerations

**Current Implementation:**
- Basic username-based identification
- Public S3 bucket for frontend
- WebSocket connection without authentication

**Recommended Improvements:**
- Add Amazon Cognito for user authentication
- Implement CloudFront with HTTPS
- Add API Gateway authorizers
- Use AWS WAF for protection
- Implement rate limiting

## 💰 Cost Breakdown

### Free Tier (12 months):
- Lambda: 1M requests/month free
- API Gateway: 1M messages/month free
- DynamoDB: 25 GB storage + 25 RCU/WCU free

### Beyond Free Tier (Estimated):
- **Light usage** (100 users, 1000 messages/day): < $1/month
- **Moderate usage** (1000 users, 10K messages/day): $5-10/month
- **Heavy usage**: Scales with usage

### Cost Optimization Tips:
- Enable DynamoDB On-Demand pricing for variable workloads
- Set Lambda memory appropriately (128 MB is sufficient)
- Use CloudWatch Logs retention policies
- Implement connection cleanup

## 🧪 Testing

### Manual Testing:
1. Open app in two different browsers
2. Create room in Browser 1 (becomes admin)
3. Join room in Browser 2 with Room ID
4. Approve join request in Browser 1
5. Send messages back and forth

### Automated Testing:
Consider adding:
- Unit tests for Lambda functions
- Integration tests for API Gateway routes
- Load testing with Artillery or K6

## 📊 Monitoring

### CloudWatch Logs:
- Each Lambda function logs to: `/aws/lambda/ChatApp-[FunctionName]`
- API Gateway logs (if enabled)

### Metrics to Monitor:
- Lambda invocations and errors
- API Gateway connection count
- DynamoDB read/write capacity
- Lambda duration and memory usage

## 🔧 Troubleshooting

See the [Troubleshooting section](./SETUP_GUIDE.md#troubleshooting) in SETUP_GUIDE.md

Common issues:
- WebSocket connection failures
- Lambda timeout errors
- DynamoDB permission issues
- CORS problems (not applicable for WebSocket)

## 🚧 Future Enhancements

- [ ] User authentication with Cognito
- [ ] Message history and pagination
- [ ] File/image sharing
- [ ] Typing indicators
- [ ] Room deletion by admin
- [ ] Kick user functionality
- [ ] Private messaging
- [ ] Message reactions
- [ ] Custom domains with Route 53
- [ ] HTTPS with CloudFront

## 📚 Resources

- [AWS WebSocket API Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [AWS Lambda with Python](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

## 📝 License

This project is provided as-is for educational purposes.

## 🤝 Contributing

Feel free to fork and improve this project!

## ⚠️ Important Notes

- This is a demo application - add proper authentication for production
- Monitor AWS costs regularly
- Set up billing alerts
- Review security best practices before deploying to production
- Consider data retention policies for messages

---

**Built with ❤️ using AWS Serverless Services**
