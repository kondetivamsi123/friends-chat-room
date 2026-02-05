import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const ChatRoom = ({ user, onLogout }) => {
    const [messages, setMessages] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [channelId, setChannelId] = useState(null);
    const [error, setError] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [activeMeeting, setActiveMeeting] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const messagesEndRef = useRef(null);
    const messagesAreaRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const lastMessageIdRef = useRef(null);
    const prevMessagesLengthRef = useRef(0);

    // Initialize Chat
    useEffect(() => {
        const initChat = async () => {
            try {
                const res = await api.joinChat('Experience Sharing');
                setChannelId(res.channel_id);
            } catch (err) {
                setError('Failed to join chat: ' + err);
            }
        };
        initChat();
    }, []);

    // Check if user is at bottom of messages
    const checkIfAtBottom = () => {
        if (!messagesAreaRef.current) return true;
        const { scrollTop, scrollHeight, clientHeight } = messagesAreaRef.current;
        // Be more strict about bottom detection to prevent accidental scrolls
        return scrollHeight - scrollTop - clientHeight < 20;
    };

    // Handle scroll event
    const handleScroll = () => {
        const atBottom = checkIfAtBottom();
        setIsAtBottom(atBottom);
        if (atBottom) {
            setUnreadCount(0);
        }
    };

    // Poll for messages and typing status
    useEffect(() => {
        if (!channelId) return;

        const fetchMessages = async () => {
            try {
                const res = await api.getMessages(channelId);
                if (res.messages) {
                    const sortedMessages = [...res.messages].reverse();

                    // First load - scroll to bottom
                    if (messages.length === 0 && sortedMessages.length > 0) {
                        setMessages(sortedMessages);
                        setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                        }, 100);
                        lastMessageIdRef.current = sortedMessages[sortedMessages.length - 1].id;
                        prevMessagesLengthRef.current = sortedMessages.length;
                        return;
                    }

                    // Check for new messages
                    if (sortedMessages.length > 0) {
                        const latestId = sortedMessages[sortedMessages.length - 1].id;
                        if (lastMessageIdRef.current && latestId > lastMessageIdRef.current) {
                            // New message arrived
                            if (!isAtBottom) {
                                setUnreadCount(prev => (latestId > lastMessageIdRef.current ? prev + 1 : prev));
                            }
                        }
                        lastMessageIdRef.current = latestId;
                    }

                    setMessages(sortedMessages);
                }
                if (res.typing) {
                    const others = res.typing.filter(name => name !== user.name);
                    setTypingUsers(others);
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        };

        const fetchPresence = async () => {
            if (!user.session_id) return;
            try {
                const res = await api.getPresence(user.session_id, channelId);
                if (res.online) {
                    setOnlineUsers(res.online);
                }
                if (res.meeting) {
                    setActiveMeeting(res.meeting);
                } else {
                    setActiveMeeting(null);
                }
            } catch (err) {
                console.error("Presence error", err);
            }
        };

        fetchMessages();
        fetchPresence();
        const msgInterval = setInterval(fetchMessages, 2000);
        const presenceInterval = setInterval(fetchPresence, 10000);

        return () => {
            clearInterval(msgInterval);
            clearInterval(presenceInterval);
        };
    }, [channelId, isAtBottom, user.session_id]); // Added session_id dependency

    // Auto scroll to bottom ONLY when new messages are added AND user is at bottom
    useEffect(() => {
        if (messages.length > prevMessagesLengthRef.current) {
            const lastMsg = messages[messages.length - 1];
            const IsSentByMe = lastMsg?.author === user.name;

            if (IsSentByMe || isAtBottom) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
            prevMessagesLengthRef.current = messages.length;
        }
    }, [messages, isAtBottom, user.name]);

    // Removed the typing induced scroll to prevent jumping while others type

    // Handle typing indicator
    const handleInputChange = (e) => {
        setInputVal(e.target.value);

        if (user.session_id) {
            api.setTyping(channelId, true, user.session_id).catch(console.error);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                api.setTyping(channelId, false, user.session_id).catch(console.error);
            }, 3000);
        }
    };

    // Handle file upload (photos)
    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            setTimeout(() => setError(''), 3000);
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image too large. Max 5MB');
            setTimeout(() => setError(''), 3000);
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Image = event.target.result;
            const messageBody = `[IMAGE]${base64Image}`;

            try {
                await api.postMessage(channelId, messageBody, user.session_id);
            } catch (err) {
                setError('Failed to send image: ' + err);
            }
        };
        reader.readAsDataURL(file);
    };

    // Start voice recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();

                reader.onload = async (event) => {
                    const base64Audio = event.target.result;
                    const messageBody = `[VOICE]${base64Audio}`;

                    try {
                        await api.postMessage(channelId, messageBody, user.session_id);
                    } catch (err) {
                        setError('Failed to send voice: ' + err);
                    }
                };
                reader.readAsDataURL(audioBlob);

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            setError('Microphone access denied');
            setTimeout(() => setError(''), 3000);
        }
    };

    // Stop voice recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputVal.trim()) return;

        const txt = inputVal;
        setInputVal('');

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        try {
            await api.postMessage(channelId, txt, user.session_id);
        } catch (err) {
            setError('Failed to send: ' + err);
        }
    };

    const renderMessage = (msg) => {
        const isMine = msg.author === user.name;
        const msgId = `msg-${msg.id}`;

        // Check if it's an image
        if (msg.body.startsWith('[IMAGE]')) {
            const imageData = msg.body.substring(7);
            return (
                <div key={msg.id} id={msgId} className={`message ${isMine ? 'mine' : 'others'}`}>
                    <span className="message-author">{msg.author}</span>
                    <img src={imageData} alt="Shared" style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
            );
        }

        // Check if it's a voice message
        if (msg.body.startsWith('[VOICE]')) {
            const audioData = msg.body.substring(7);
            return (
                <div key={msg.id} id={msgId} className={`message ${isMine ? 'mine' : 'others'}`}>
                    <span className="message-author">{msg.author}</span>
                    <audio controls style={{ maxWidth: '200px', marginTop: '4px' }}>
                        <source src={audioData} type="audio/webm" />
                    </audio>
                </div>
            );
        }

        // Check if it's a Watch Together link
        if (msg.body.startsWith('[WATCH]')) {
            const videoUrl = msg.body.substring(7);
            // Open YouTube directly for reliability, as Jitsi/Watch2Gether can sometimes 404 or be blocked
            return (
                <div key={msg.id} id={msgId} className={`message ${isMine ? 'mine' : 'others'} watch-message`}>
                    <span className="message-author">{msg.author}</span>
                    <div className="watch-card">
                        <span style={{ fontSize: '1.2rem' }}>🍿 Together Watch</span>
                        <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>Watch video with friends</p>
                        <button
                            onClick={() => window.open(videoUrl, '_blank')}
                            className="join-watch-btn"
                        >
                            Open Video
                        </button>
                    </div>
                </div>
            );
        }

        // Regular text message
        const body = msg.body || '';
        const text = String(body).replace(/<[^>]+>/g, '');
        return (
            <div key={msg.id} id={msgId} className={`message ${isMine ? 'mine' : 'others'}`}>
                <span className="message-author">{msg.author}</span>
                {text}
            </div>
        );
    };

    const startMeeting = async () => {
        const meetingUrl = `https://meet.jit.si/FriendsExperience_${channelId}_${Date.now()}`;
        try {
            await api.startMeeting(channelId, meetingUrl, user.session_id);
            window.open(meetingUrl, '_blank');
            api.postMessage(channelId, `🎥 I started a video meeting! Join here: ${meetingUrl}`, user.session_id);
        } catch (err) {
            setError('Failed to start meeting: ' + err);
        }
    };

    const joinActiveMeeting = () => {
        if (activeMeeting) {
            window.open(activeMeeting.meeting_url, '_blank');
        }
    };

    const watchTogether = () => {
        const videoUrl = prompt('Enter YouTube Video URL:');
        if (videoUrl) {
            api.postMessage(channelId, `[WATCH]${videoUrl}`, user.session_id);
        }
    };

    if (!channelId && !error) return <div className="card">Loading Chat...</div>;

    return (
        <div className="card chat-room-card" style={{ width: '100%', maxWidth: '800px' }}>
            <div className="chat-header">
                <div>
                    <h1>Friends Chat Room</h1>
                    <h2>Share your experiences</h2>
                </div>
                <div className="header-actions">
                    {activeMeeting && (
                        <button onClick={joinActiveMeeting} className="action-button join-btn" title="Join In-Progress Meeting">
                            🟢 Join Meeting
                        </button>
                    )}
                    <button onClick={startMeeting} className="action-button meeting-btn" title="Start Video Meeting">
                        🎥 Meeting
                    </button>
                    <button onClick={() => {
                        const exp = prompt('Share your experience with the group:');
                        if (exp) api.postMessage(channelId, `🌟 **Experience Share:** ${exp}`, user.session_id);
                    }} className="action-button share-btn" title="Share Experience">
                        🌟 Share Experience
                    </button>
                    <button onClick={watchTogether} className="action-button watch-btn" title="Watch Together">
                        🍿 Watch
                    </button>
                    <button onClick={onLogout} className="action-button logout-btn" title="Logout">
                        ❌ Logout
                    </button>
                </div>
            </div>

            {error && <div className="error-msg">{error}</div>}

            <div className="main-chat-layout">
                <div className="participants-sidebar">
                    <h3>Online Friends</h3>
                    <div className="online-list">
                        {onlineUsers.length > 0 ? (
                            onlineUsers.map(name => (
                                <div key={name} className="online-user">
                                    <span className="status-dot"></span>
                                    {name} {name === user.name && '(You)'}
                                </div>
                            ))
                        ) : (
                            <p>No one online</p>
                        )}
                    </div>
                </div>

                <div className="main-chat-content">
                    <div className="messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
                        {messages.map(renderMessage)}

                        {/* Typing Indicator */}
                        {typingUsers.length > 0 && (
                            <div className="typing-indicator">
                                <em>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</em>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Unread Messages Badge */}
                    {unreadCount > 0 && (
                        <div
                            className="unread-badge"
                            onClick={() => {
                                setIsAtBottom(true);
                                setUnreadCount(0);
                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            {unreadCount} new message{unreadCount > 1 ? 's' : ''} ↓
                        </div>
                    )}

                    <form className="chat-input-area" onSubmit={handleSend}>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                            id="file-input"
                        />
                        <label htmlFor="file-input" className="icon-button" title="Send Photo">
                            📷
                        </label>

                        <button
                            type="button"
                            className={`icon-button ${isRecording ? 'recording' : ''}`}
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            title="Hold to record voice"
                        >
                            {isRecording ? '⏹️' : '🎤'}
                        </button>

                        <input
                            type="text"
                            placeholder="Type your message..."
                            value={inputVal}
                            onChange={handleInputChange}
                        />
                        <button type="submit">Send</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;
