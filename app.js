// WebSocket connection
let ws = null;
let userId = null;
let currentRoomId = null;
let isAdmin = false;

// Voice chat variables
let currentVoiceRoomId = null;
let signalingClient = null;
let peerConnection = null;
let localStream = null;
let remoteStreams = {};
let isMuted = false;
let isVoiceMaster = false;
const AWS_REGION = 'us-east-1'; // Change to your region

// WebSocket API endpoint - NO TRAILING SLASH!
const WS_ENDPOINT = "wss://h1sc2uum8k.execute-api.eu-north-1.amazonaws.com";

function connect() {
    userId = document.getElementById('username-input').value.trim();
    if (!userId) {
        alert('Please enter a username');
        return;
    }

    ws = new WebSocket(`${WS_ENDPOINT}?userId=${encodeURIComponent(userId)}`);

    ws.onopen = () => {
        console.log('Connected to WebSocket');
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('room-section').style.display = 'block';
    };

    ws.onmessage = (event) => {
        console.log('Received message from server:', event.data);
        try {
            const data = JSON.parse(event.data);
            console.log('Parsed message:', data);
            handleMessage(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            console.error('Raw message:', event.data);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('Connection error. Please try again.');
    };

    ws.onclose = () => {
        console.log('Disconnected from WebSocket');
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('room-section').style.display = 'none';
        document.getElementById('chat-section').style.display = 'none';
    };
}

function createRoom() {
    const roomName = document.getElementById('room-name-input').value.trim();
    if (!roomName) {
        alert('Please enter a room name');
        return;
    }

    ws.send(JSON.stringify({
        action: 'createRoom',
        roomName: roomName
    }));
}

function joinRoom() {
    const roomId = document.getElementById('join-room-input').value.trim();
    if (!roomId) {
        alert('Please enter a room ID');
        return;
    }

    ws.send(JSON.stringify({
        action: 'joinRoom',
        subAction: 'request',
        roomId: roomId
    }));
}

function leaveRoom() {
    currentRoomId = null;
    isAdmin = false;
    document.getElementById('chat-section').style.display = 'none';
    document.getElementById('room-section').style.display = 'block';
    document.getElementById('messages-container').innerHTML = '';
}

function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message) return;

    console.log('Sending message:', message);
    console.log('Current room:', currentRoomId);
    console.log('WebSocket state:', ws ? ws.readyState : 'null');

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected to server. Please refresh and reconnect.');
        return;
    }

    try {
        ws.send(JSON.stringify({
            action: 'sendMessage',
            message: message
        }));
        console.log('Message sent successfully');
        
        // Display your own message immediately
        displayMessage(userId, message, Date.now());
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message. Check console for details.');
    }

    messageInput.value = '';
}

function showMembers() {
    ws.send(JSON.stringify({
        action: 'getMembers',
        roomId: currentRoomId
    }));
}

function closeMembers() {
    document.getElementById('members-modal').style.display = 'none';
}

function approveUser(targetUserId) {
    ws.send(JSON.stringify({
        action: 'joinRoom',
        subAction: 'approve',
        roomId: currentRoomId,
        targetUserId: targetUserId
    }));
}

function rejectUser(targetUserId) {
    ws.send(JSON.stringify({
        action: 'joinRoom',
        subAction: 'reject',
        roomId: currentRoomId,
        targetUserId: targetUserId
    }));
}

function handleMessage(data) {
    console.log('Handling message:', data);
    
    switch(data.action) {
        case 'roomCreated':
            currentRoomId = data.roomId;
            isAdmin = true;
            console.log('Room created:', data.roomId);
            enterChatRoom(data.roomName, data.roomId);
            break;

        case 'joinResponse':
            if (data.status === 'approved') {
                currentRoomId = data.roomId;
                console.log('Joined room:', data.roomId);
                enterChatRoom('Chat Room', data.roomId);
            } else if (data.status === 'rejected') {
                alert('Your join request was rejected');
            }
            break;

        case 'joinRequest':
            if (isAdmin) {
                console.log('Join request from:', data.userId);
                alert(`User ${data.userId} wants to join the room. Check members list.`);
            }
            break;

        case 'message':
            console.log('Message received:', data);
            // Only display if it's from someone else (avoid duplicates)
            if (data.userId !== userId) {
                displayMessage(data.userId, data.message, data.timestamp);
            }
            break;

        case 'roomMembers':
            displayMembers(data.participants);
            break;
        
        // Voice chat events
        case 'voiceRoomCreated':
            console.log('Voice room created:', data.voiceRoomId);
            currentVoiceRoomId = data.voiceRoomId;
            document.getElementById('start-voice-btn').style.display = 'none';
            updateVoiceStatus('Voice room created. Getting credentials...');
            
            // Auto-join as master
            ws.send(JSON.stringify({
                action: 'getVoiceCredentials',
                voiceRoomId: currentVoiceRoomId
            }));
            break;
        
        case 'voiceRoomAvailable':
            console.log('Voice room available:', data.voiceRoomId);
            currentVoiceRoomId = data.voiceRoomId;
            document.getElementById('start-voice-btn').style.display = 'none';
            document.getElementById('join-voice-btn').style.display = 'inline-block';
            updateVoiceStatus(`Voice chat available (started by ${data.masterUserId}). Click to join.`);
            break;
        
        case 'voiceCredentials':
            console.log('Received voice credentials, initializing WebRTC...');
            initializeWebRTC(data);
            break;
        
        case 'voiceRoomEnded':
            console.log('Voice room ended:', data.voiceRoomId);
            if (currentVoiceRoomId === data.voiceRoomId) {
                cleanupVoiceChat();
                updateVoiceStatus('Voice chat ended by host');
                setTimeout(() => updateVoiceStatus(''), 3000);
            }
            break;
        
        case 'error':
            console.error('Error from server:', data.message);
            updateVoiceStatus(`Error: ${data.message}`);
            // Reset the voice room creation state
            if (data.type === 'voiceRoomError') {
                document.getElementById('start-voice-btn').style.display = 'inline-block';
            }
            break;
            
        default:
            console.warn('Unknown message type:', data.action);
            console.warn('Full message data:', JSON.stringify(data, null, 2));
            
            // If there's an error in the response, show it
            if (data.statusCode && data.statusCode !== 200) {
                console.error('Error response from server:', data);
                updateVoiceStatus(`Error: ${data.body || 'Unknown error'}`);
            }
    }
}

function enterChatRoom(roomName, roomId) {
    document.getElementById('room-section').style.display = 'none';
    document.getElementById('chat-section').style.display = 'block';
    document.getElementById('room-title').textContent = `${roomName} (ID: ${roomId})`;
}

function displayMessage(senderId, message, timestamp) {
    const messagesContainer = document.getElementById('messages-container');
    const messageDiv = document.createElement('div');
    
    // Add 'own-message' class if it's your message
    const isOwnMessage = senderId === userId;
    messageDiv.className = isOwnMessage ? 'message own-message' : 'message';
    
    const time = new Date(timestamp).toLocaleTimeString();
    
    messageDiv.innerHTML = `
        <span class="username">${isOwnMessage ? 'You' : senderId}:</span>
        <span class="message-text">${escapeHtml(message)}</span>
        <span class="timestamp">${time}</span>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function displayMembers(participants) {
    const membersModal = document.getElementById('members-modal');
    const membersList = document.getElementById('members-list');
    const pendingRequests = document.getElementById('pending-requests');
    
    membersList.innerHTML = '<h4>Members</h4>';
    pendingRequests.innerHTML = '';
    
    const approved = participants.filter(p => p.status === 'approved');
    const pending = participants.filter(p => p.status === 'pending');
    
    approved.forEach(participant => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'member-item';
        memberDiv.innerHTML = `
            <span>${participant.userId}</span>
            ${participant.isAdmin ? '<span class="admin-badge">ADMIN</span>' : ''}
        `;
        membersList.appendChild(memberDiv);
    });
    
    if (isAdmin && pending.length > 0) {
        pendingRequests.innerHTML = '<h4>Pending Requests</h4>';
        pending.forEach(participant => {
            const requestDiv = document.createElement('div');
            requestDiv.className = 'member-item';
            requestDiv.innerHTML = `
                <span>${participant.userId} <span class="pending-badge">PENDING</span></span>
                <div>
                    <button onclick="approveUser('${participant.userId}')">Approve</button>
                    <button onclick="rejectUser('${participant.userId}')" 
                            style="background:#f44336">Reject</button>
                </div>
            `;
            pendingRequests.appendChild(requestDiv);
        });
    }
    
    membersModal.style.display = 'flex';
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ==================== VOICE CHAT FUNCTIONS ====================

function startVoiceChat() {
    if (!currentRoomId) {
        alert('You must be in a chat room first');
        return;
    }
    
    console.log('Starting voice chat for room:', currentRoomId);
    console.log('WebSocket state:', ws.readyState, ws.readyState === WebSocket.OPEN ? '(OPEN)' : '(NOT OPEN)');
    updateVoiceStatus('Creating voice room...');
    
    const message = {
        action: 'createVoiceRoom',
        roomId: currentRoomId
    };
    console.log('Sending createVoiceRoom message:', JSON.stringify(message));
    
    ws.send(JSON.stringify(message));
    console.log('Message sent successfully');
    
    // Add timeout to detect if no response comes back
    setTimeout(() => {
        if (!currentVoiceRoomId) {
            console.error('❌ TIMEOUT: No response received after 10 seconds');
            console.error('This means the Lambda is either:');
            console.error('1. Not being invoked (route not connected)');
            console.error('2. Failing before sending a response');
            console.error('3. Missing environment variables or permissions');
            console.error('Check CloudWatch logs: /aws/lambda/CreateVoiceRoomHandler');
            updateVoiceStatus('Error: No response from server (timeout). Check console for details.');
        }
    }, 10000);
}

function joinVoiceChat() {
    if (!currentVoiceRoomId) {
        alert('No active voice room');
        return;
    }
    
    console.log('Joining voice chat:', currentVoiceRoomId);
    updateVoiceStatus('Joining voice room...');
    
    ws.send(JSON.stringify({
        action: 'getVoiceCredentials',
        voiceRoomId: currentVoiceRoomId
    }));
}

function endVoiceChat() {
    if (!currentVoiceRoomId) return;
    
    console.log('Ending voice chat:', currentVoiceRoomId);
    
    ws.send(JSON.stringify({
        action: 'endVoiceRoom',
        voiceRoomId: currentVoiceRoomId
    }));
    
    cleanupVoiceChat();
}

function toggleMute() {
    if (!localStream) return;
    
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });
    
    const muteBtn = document.getElementById('mute-btn');
    muteBtn.textContent = isMuted ? '🔊 Unmute' : '🔇 Mute';
    muteBtn.style.background = isMuted ? '#f44336' : '#ff9800';
    
    updateVoiceStatus(isMuted ? 'Microphone muted' : 'Microphone active');
}

async function initializeWebRTC(voiceConfig) {
    try {
        console.log('Initializing WebRTC with config:', voiceConfig);
        
        // Get microphone access
        updateVoiceStatus('Requesting microphone access...');
        localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }, 
            video: false 
        });
        
        console.log('✓ Microphone access granted');
        updateVoiceStatus('Connecting to voice channel...');
        
        // Configure AWS SDK credentials
        const credentials = voiceConfig.credentials;
        const role = voiceConfig.role === 'MASTER' ? 
            KVSWebRTC.Role.MASTER : KVSWebRTC.Role.VIEWER;
        
        console.log('Role:', role);
        console.log('Channel ARN:', voiceConfig.channelARN);
        
        // Find WSS endpoint
        const wssEndpoint = voiceConfig.endpoints.find(e => e.Protocol === 'WSS');
        if (!wssEndpoint) {
            throw new Error('WSS endpoint not found');
        }
        
        console.log('WSS Endpoint:', wssEndpoint.ResourceEndpoint);
        
        // Create KVS signaling client
        signalingClient = new KVSWebRTC.SignalingClient({
            channelARN: voiceConfig.channelARN,
            channelEndpoint: wssEndpoint.ResourceEndpoint,
            role: role,
            region: AWS_REGION,
            credentials: {
                accessKeyId: credentials.accessKeyId,
                secretAccessKey: credentials.secretAccessKey,
                sessionToken: credentials.sessionToken
            },
            systemClockOffset: 0
        });
        
        // Set up signaling client event listeners
        signalingClient.on('open', async () => {
            console.log('✓ Signaling client connected');
            
            if (role === KVSWebRTC.Role.MASTER) {
                isVoiceMaster = true;
                document.getElementById('end-voice-btn').style.display = 'inline-block';
                document.getElementById('start-voice-btn').style.display = 'none';
            } else {
                document.getElementById('join-voice-btn').style.display = 'none';
            }
            
            document.getElementById('mute-btn').style.display = 'inline-block';
            updateVoiceStatus('Connected to voice chat');
        });
        
        signalingClient.on('sdpOffer', async (offer, remoteClientId) => {
            console.log('Received SDP offer from:', remoteClientId);
            await handleSdpOffer(offer, remoteClientId);
        });
        
        signalingClient.on('sdpAnswer', async (answer, remoteClientId) => {
            console.log('Received SDP answer from:', remoteClientId);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(answer);
                console.log('✓ Remote description set');
            }
        });
        
        signalingClient.on('iceCandidate', async (candidate, remoteClientId) => {
            console.log('Received ICE candidate from:', remoteClientId);
            if (peerConnection) {
                await peerConnection.addIceCandidate(candidate);
            }
        });
        
        signalingClient.on('close', () => {
            console.log('Signaling client disconnected');
            updateVoiceStatus('Voice chat disconnected');
        });
        
        signalingClient.on('error', (error) => {
            console.error('Signaling client error:', error);
            updateVoiceStatus('Voice error: ' + error.message);
        });
        
        // Open signaling connection
        signalingClient.open();
        
        // If VIEWER, create peer connection and send offer
        if (role === KVSWebRTC.Role.VIEWER) {
            console.log('Creating peer connection as VIEWER');
            await createPeerConnection('MASTER');
            
            // Add local stream
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
            
            // Create and send offer
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });
            await peerConnection.setLocalDescription(offer);
            console.log('Sending SDP offer to MASTER');
            signalingClient.sendSdpOffer(peerConnection.localDescription);
        }
        
    } catch (error) {
        console.error('Error initializing WebRTC:', error);
        alert('Failed to start voice chat: ' + error.message);
        cleanupVoiceChat();
    }
}

async function handleSdpOffer(offer, remoteClientId) {
    try {
        await createPeerConnection(remoteClientId);
        await peerConnection.setRemoteDescription(offer);
        
        // Add local stream
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Create and send answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        console.log('Sending SDP answer to:', remoteClientId);
        signalingClient.sendSdpAnswer(peerConnection.localDescription, remoteClientId);
    } catch (error) {
        console.error('Error handling SDP offer:', error);
    }
}

async function createPeerConnection(remoteClientId) {
    console.log('Creating peer connection for:', remoteClientId);
    
    // Configure STUN server
    const configuration = {
        iceServers: [
            { urls: `stun:stun.kinesisvideo.${AWS_REGION}.amazonaws.com:443` }
        ]
    };
    
    peerConnection = new RTCPeerConnection(configuration);
    
    // Handle ICE candidates
    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            console.log('Sending ICE candidate to:', remoteClientId);
            signalingClient.sendIceCandidate(candidate, remoteClientId);
        }
    };
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
        console.log('✓ Received remote audio track');
        const [remoteStream] = event.streams;
        
        // Create audio element for remote stream
        let audioElement = document.getElementById(`audio-${remoteClientId}`);
        if (!audioElement) {
            audioElement = document.createElement('audio');
            audioElement.id = `audio-${remoteClientId}`;
            audioElement.autoplay = true;
            audioElement.controls = false;
            document.getElementById('remote-audio-container').appendChild(audioElement);
        }
        
        audioElement.srcObject = remoteStream;
        remoteStreams[remoteClientId] = remoteStream;
        
        addVoiceParticipant(remoteClientId);
        updateVoiceStatus('Voice connected - speaking with participants');
    };
    
    peerConnection.onconnectionstatechange = () => {
        console.log('Peer connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            updateVoiceStatus('Voice connected');
        } else if (peerConnection.connectionState === 'disconnected') {
            updateVoiceStatus('Voice disconnected');
        } else if (peerConnection.connectionState === 'failed') {
            updateVoiceStatus('Voice connection failed');
            cleanupVoiceChat();
        }
    };
    
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
    };
    
    return peerConnection;
}

function cleanupVoiceChat() {
    console.log('Cleaning up voice chat');
    
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => {
            track.stop();
            console.log('Stopped local track');
        });
        localStream = null;
    }
    
    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        console.log('Closed peer connection');
    }
    
    // Close signaling client
    if (signalingClient) {
        signalingClient.close();
        signalingClient = null;
        console.log('Closed signaling client');
    }
    
    // Remove remote audio elements
    document.getElementById('remote-audio-container').innerHTML = '';
    remoteStreams = {};
    
    // Reset UI
    document.getElementById('start-voice-btn').style.display = 'inline-block';
    document.getElementById('join-voice-btn').style.display = 'none';
    document.getElementById('end-voice-btn').style.display = 'none';
    document.getElementById('mute-btn').style.display = 'none';
    document.getElementById('voice-participants').innerHTML = '';
    updateVoiceStatus('');
    
    currentVoiceRoomId = null;
    isVoiceMaster = false;
    isMuted = false;
}

function updateVoiceStatus(status) {
    const statusElement = document.getElementById('voice-status');
    statusElement.textContent = status;
    console.log('Voice status:', status);
}

function addVoiceParticipant(participantId) {
    const participantsDiv = document.getElementById('voice-participants');
    
    // Check if already added
    if (document.getElementById(`voice-participant-${participantId}`)) {
        return;
    }
    
    const participantSpan = document.createElement('span');
    participantSpan.className = 'voice-participant';
    participantSpan.id = `voice-participant-${participantId}`;
    participantSpan.textContent = `🎤 ${participantId}`;
    participantsDiv.appendChild(participantSpan);
}
