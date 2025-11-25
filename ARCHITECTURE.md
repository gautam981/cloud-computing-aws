# AWS Group Chat Application Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER'S BROWSER                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Frontend (HTML/CSS/JavaScript)                            │    │
│  │  - Login UI                                                 │    │
│  │  - Room Creation/Join                                       │    │
│  │  - Chat Interface                                           │    │
│  │  - Admin Controls                                           │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ HTTPS (Static Content)
                           ▼
                  ┌─────────────────┐
                  │   Amazon S3     │
                  │ Static Website  │
                  │    Hosting      │
                  └─────────────────┘
                           
                           
                           │ WSS (WebSocket Secure)
                           ▼
        ┌──────────────────────────────────────────┐
        │    API Gateway WebSocket API             │
        │  ┌────────────────────────────────────┐  │
        │  │ Routes:                            │  │
        │  │  • $connect    → ConnectHandler    │  │
        │  │  • $disconnect → DisconnectHandler │  │
        │  │  • createRoom  → CreateRoomHandler │  │
        │  │  • joinRoom    → JoinRoomHandler   │  │
        │  │  • sendMessage → SendMessageHandler│  │
        │  │  • getMembers  → GetMembersHandler │  │
        │  │  • $default    → DefaultHandler    │  │
        │  └────────────────────────────────────┘  │
        └──────────────────┬───────────────────────┘
                           │
                           │ Invoke
                           ▼
        ┌──────────────────────────────────────────┐
        │         AWS Lambda Functions             │
        │  ┌────────────────────────────────────┐  │
        │  │  7 Python 3.11 Functions:         │  │
        │  │                                    │  │
        │  │  1. ConnectHandler                │  │
        │  │     - Store connection info       │  │
        │  │                                    │  │
        │  │  2. DisconnectHandler             │  │
        │  │     - Clean up connection         │  │
        │  │                                    │  │
        │  │  3. CreateRoomHandler             │  │
        │  │     - Create new room             │  │
        │  │     - Set creator as admin        │  │
        │  │                                    │  │
        │  │  4. JoinRoomHandler               │  │
        │  │     - Handle join requests        │  │
        │  │     - Approve/reject users        │  │
        │  │                                    │  │
        │  │  5. SendMessageHandler            │  │
        │  │     - Validate sender             │  │
        │  │     - Broadcast to participants   │  │
        │  │                                    │  │
        │  │  6. GetRoomMembersHandler         │  │
        │  │     - Return participant list     │  │
        │  │                                    │  │
        │  │  7. DefaultHandler                │  │
        │  │     - Error for unknown actions   │  │
        │  └────────────────────────────────────┘  │
        └──────────────────┬───────────────────────┘
                           │
                           │ Read/Write
                           ▼
        ┌──────────────────────────────────────────┐
        │         Amazon DynamoDB                  │
        │  ┌────────────────────────────────────┐  │
        │  │  Table 1: ChatConnections          │  │
        │  │  PK: connectionId                  │  │
        │  │  - userId                          │  │
        │  │  - roomId                          │  │
        │  │  - timestamp                       │  │
        │  └────────────────────────────────────┘  │
        │  ┌────────────────────────────────────┐  │
        │  │  Table 2: ChatRooms                │  │
        │  │  PK: roomId                        │  │
        │  │  - roomName                        │  │
        │  │  - adminUserId                     │  │
        │  │  - participants (map)              │  │
        │  │  - createdAt                       │  │
        │  └────────────────────────────────────┘  │
        │  ┌────────────────────────────────────┐  │
        │  │  Table 3: ChatMessages             │  │
        │  │  PK: roomId, SK: timestamp         │  │
        │  │  - userId                          │  │
        │  │  - message                         │  │
        │  └────────────────────────────────────┘  │
        └────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. User Connection Flow
```
User enters username
        │
        ▼
Browser opens WebSocket connection
        │
        ▼
API Gateway receives $connect
        │
        ▼
ConnectHandler Lambda invoked
        │
        ▼
Store connectionId + userId in ChatConnections table
        │
        ▼
Return success to user
```

### 2. Room Creation Flow
```
Admin clicks "Create Room"
        │
        ▼
Send { action: "createRoom", roomName: "..." }
        │
        ▼
API Gateway routes to CreateRoomHandler
        │
        ▼
Lambda generates UUID for roomId
        │
        ▼
Store room in ChatRooms table
    - adminUserId = creator
    - participants = { creator: "approved" }
        │
        ▼
Update connection with roomId
        │
        ▼
Send roomId back to admin
```

### 3. Join Request Flow
```
User B clicks "Join Room" with roomId
        │
        ▼
Send { action: "joinRoom", subAction: "request", roomId: "..." }
        │
        ▼
JoinRoomHandler receives request
        │
        ▼
Update ChatRooms: participants[userB] = "pending"
        │
        ▼
Query ChatConnections for admin's connectionId
        │
        ▼
Send join request notification to admin via WebSocket
        │
        ▼
Admin sees notification + pending request in members list
```

### 4. Join Approval Flow
```
Admin clicks "Approve" for User B
        │
        ▼
Send { action: "joinRoom", subAction: "approve", targetUserId: "..." }
        │
        ▼
JoinRoomHandler validates admin permission
        │
        ▼
Update ChatRooms: participants[userB] = "approved"
        │
        ▼
Query User B's connectionId
        │
        ▼
Send approval notification to User B
        │
        ▼
User B can now send/receive messages
```

### 5. Message Broadcast Flow
```
User sends message: "Hello!"
        │
        ▼
Send { action: "sendMessage", message: "Hello!" }
        │
        ▼
SendMessageHandler receives message
        │
        ▼
Query sender's roomId from ChatConnections
        │
        ▼
Query room details from ChatRooms
        │
        ▼
Verify sender is approved participant
        │
        ▼
Store message in ChatMessages table
        │
        ▼
Query all approved participants' connectionIds
        │
        ▼
Broadcast message to all active connections
        │
        ▼
All users see message in real-time
```

---

## Request/Response Format

### Client to Server Messages

#### Create Room
```json
{
  "action": "createRoom",
  "roomName": "General Chat"
}
```

#### Join Room (Request)
```json
{
  "action": "joinRoom",
  "subAction": "request",
  "roomId": "uuid-here"
}
```

#### Approve Join
```json
{
  "action": "joinRoom",
  "subAction": "approve",
  "roomId": "uuid-here",
  "targetUserId": "username"
}
```

#### Reject Join
```json
{
  "action": "joinRoom",
  "subAction": "reject",
  "roomId": "uuid-here",
  "targetUserId": "username"
}
```

#### Send Message
```json
{
  "action": "sendMessage",
  "message": "Hello everyone!"
}
```

#### Get Members
```json
{
  "action": "getMembers",
  "roomId": "uuid-here"
}
```

### Server to Client Messages

#### Room Created
```json
{
  "action": "roomCreated",
  "roomId": "uuid-here",
  "roomName": "General Chat"
}
```

#### Join Request (to Admin)
```json
{
  "action": "joinRequest",
  "userId": "bob",
  "roomId": "uuid-here"
}
```

#### Join Response
```json
{
  "action": "joinResponse",
  "roomId": "uuid-here",
  "status": "approved" // or "rejected"
}
```

#### Message Broadcast
```json
{
  "action": "message",
  "userId": "alice",
  "message": "Hello!",
  "timestamp": 1699999999999
}
```

#### Room Members
```json
{
  "action": "roomMembers",
  "roomId": "uuid-here",
  "roomName": "General Chat",
  "participants": [
    {"userId": "alice", "status": "approved", "isAdmin": true},
    {"userId": "bob", "status": "approved", "isAdmin": false},
    {"userId": "charlie", "status": "pending", "isAdmin": false}
  ]
}
```

---

## Security & Permissions Model

### IAM Role Permissions
```
ChatAppLambdaExecutionRole
├── AWSLambdaBasicExecutionRole (AWS Managed)
│   └── CloudWatch Logs write access
│
└── ChatAppLambdaPolicy (Custom)
    ├── DynamoDB Actions:
    │   ├── PutItem
    │   ├── GetItem
    │   ├── UpdateItem
    │   ├── DeleteItem
    │   ├── Scan
    │   └── Query
    │
    └── API Gateway Actions:
        └── execute-api:ManageConnections
            (For sending messages back to clients)
```

### Data Access Patterns

#### ChatConnections Table
- **Write**: On connect (PutItem)
- **Read**: Get user info (GetItem), Find admin (Scan)
- **Update**: Set roomId (UpdateItem)
- **Delete**: On disconnect (DeleteItem)

#### ChatRooms Table
- **Write**: Create room (PutItem)
- **Read**: Get room details (GetItem)
- **Update**: Add/update participants (UpdateItem)
- **Delete**: (Future: room deletion feature)

#### ChatMessages Table
- **Write**: Store message (PutItem)
- **Read**: (Future: message history query)
- **Update**: N/A
- **Delete**: (Future: message deletion)

---

## Scalability Considerations

### Current Capacity
- **Concurrent connections**: Limited by API Gateway (10,000 by default)
- **Messages/second**: Handled by Lambda concurrent executions
- **DynamoDB throughput**: On-demand scaling (default)

### How It Scales
1. **More users connect**
   - API Gateway handles more WebSocket connections
   - Lambda functions scale automatically
   - DynamoDB auto-scales read/write capacity

2. **More messages sent**
   - Lambda concurrent executions increase
   - DynamoDB handles more writes
   - Broadcast to N users = N API Gateway post_to_connection calls

3. **More rooms created**
   - Linear growth in DynamoDB storage
   - No impact on performance

### Scaling Limits
- API Gateway: 10,000 concurrent connections (can request increase)
- Lambda: 1,000 concurrent executions (can request increase)
- DynamoDB: 40,000 RCU/WCU per table (on-demand)

---

## Cost Breakdown by Component

### Per 1000 Users/Day Estimates

**Lambda Invocations:**
- Connect/Disconnect: 2,000 invocations
- Create rooms: 100 invocations
- Join rooms: 500 invocations
- Send messages: 10,000 invocations
- Get members: 500 invocations
- **Total**: ~13,100 invocations/day = ~$0.003

**API Gateway:**
- WebSocket connections: 1,000 connects
- Messages: ~13,000 messages/day
- **Total**: ~$0.04/day = ~$1.20/month

**DynamoDB:**
- Reads: ~15,000 RCU
- Writes: ~12,000 WCU
- Storage: ~1 GB
- **Total**: ~$3.50/month

**S3:**
- Storage: Negligible
- Requests: ~10,000 GET requests
- **Total**: ~$0.01/month

**Grand Total**: ~$5/month for 1,000 active users

---

This architecture provides a serverless, scalable, and cost-effective solution for real-time group chat!
