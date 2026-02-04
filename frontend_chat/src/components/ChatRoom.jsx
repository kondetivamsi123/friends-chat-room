import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const ChatRoom = ({ user }) => {
    const [messages, setMessages] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [channelId, setChannelId] = useState(null);
    const [error, setError] = useState('');
    const [typingUsers, setTypingUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

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

    // Poll for messages and typing status
    useEffect(() => {
        if (!channelId) return;

        const fetchMessages = async () => {
            try {
                const res = await api.getMessages(channelId);
                if (res.messages) {
                    setMessages(res.messages.reverse());
                }
                if (res.typing) {
                    // Filter out current user from typing list
                    const others = res.typing.filter(name => name !== user.name);
                    setTypingUsers(others);
                }
            } catch (err) {
                console.error("Polling error", err);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [channelId, user.name]);

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle typing indicator
    const handleInputChange = (e) => {
        setInputVal(e.target.value);

        // Send typing indicator
        if (user.session_id) {
            api.setTyping(channelId, true, user.session_id).catch(console.error);

            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Stop typing after 3 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                api.setTyping(channelId, false, user.session_id).catch(console.error);
            }, 3000);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputVal.trim()) return;

        const txt = inputVal;
        setInputVal(''); // Optimistic clear

        // Clear typing indicator
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        try {
            await api.postMessage(channelId, txt, user.session_id);
        } catch (err) {
            setError('Failed to send: ' + err);
        }
    };

    if (!channelId && !error) return <div className="card">Loading Chat...</div>;

    return (
        <div className="card" style={{ width: '100%', maxWidth: '800px' }}>
            <h1>Friends Chat Room</h1>
            <h2>Share your experiences</h2>

            {error && <div className="error-msg">{error}</div>}

            <div className="chat-container">
                <div className="messages-area">
                    {messages.map((msg) => {
                        const isMine = msg.author === user.name;
                        const text = msg.body.replace(/<[^>]+>/g, '');

                        return (
                            <div key={msg.id} className={`message ${isMine ? 'mine' : 'others'}`}>
                                <span className="message-author">{msg.author}</span>
                                {text}
                            </div>
                        );
                    })}

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <div className="typing-indicator">
                            <em>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</em>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={handleSend}>
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
