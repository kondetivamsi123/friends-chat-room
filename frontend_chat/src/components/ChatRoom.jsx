import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const ChatRoom = ({ user }) => {
    const [messages, setMessages] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [channelId, setChannelId] = useState(null);
    const [error, setError] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const messagesEndRef = useRef(null);
    const messagesAreaRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const lastMessageIdRef = useRef(null);

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
        const threshold = 100; // pixels from bottom
        return scrollHeight - scrollTop - clientHeight < threshold;
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
                    // Backend sends newest first, reverse to show oldest first
                    const sortedMessages = [...res.messages].reverse();

                    // Check for new messages
                    if (sortedMessages.length > 0) {
                        const latestId = sortedMessages[sortedMessages.length - 1].id;
                        if (lastMessageIdRef.current && latestId > lastMessageIdRef.current) {
                            // New message arrived
                            if (!isAtBottom) {
                                setUnreadCount(prev => prev + 1);
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

        fetchMessages();
        const interval = setInterval(fetchMessages, 2000);
        return () => clearInterval(interval);
    }, [channelId, user.name, isAtBottom]);

    // Auto scroll to bottom only if user is already at bottom
    useEffect(() => {
        if (isAtBottom && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, typingUsers, isAtBottom]);

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

        // Check if it's an image
        if (msg.body.startsWith('[IMAGE]')) {
            const imageData = msg.body.substring(7);
            return (
                <div key={msg.id} className={`message ${isMine ? 'mine' : 'others'}`}>
                    <span className="message-author">{msg.author}</span>
                    <img src={imageData} alt="Shared" style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '4px' }} />
                </div>
            );
        }

        // Check if it's a voice message
        if (msg.body.startsWith('[VOICE]')) {
            const audioData = msg.body.substring(7);
            return (
                <div key={msg.id} className={`message ${isMine ? 'mine' : 'others'}`}>
                    <span className="message-author">{msg.author}</span>
                    <audio controls style={{ maxWidth: '200px', marginTop: '4px' }}>
                        <source src={audioData} type="audio/webm" />
                    </audio>
                </div>
            );
        }

        // Regular text message
        const text = msg.body.replace(/<[^>]+>/g, '');
        return (
            <div key={msg.id} className={`message ${isMine ? 'mine' : 'others'}`}>
                <span className="message-author">{msg.author}</span>
                {text}
            </div>
        );
    };

    if (!channelId && !error) return <div className="card">Loading Chat...</div>;

    return (
        <div className="card" style={{ width: '100%', maxWidth: '800px' }}>
            <h1>Friends Chat Room</h1>
            <h2>Share your experiences</h2>

            {error && <div className="error-msg">{error}</div>}

            <div className="chat-container">
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
    );
};

export default ChatRoom;
