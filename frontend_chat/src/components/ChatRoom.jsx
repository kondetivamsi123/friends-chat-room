import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const ChatRoom = ({ user, onLogout }) => {
    const [messages, setMessages] = useState([]);
    const [inputVal, setInputVal] = useState('');
    const [channelId, setChannelId] = useState(null);
    const [channels, setChannels] = useState([]);
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
                // Join primary channel initially
                const res = await api.joinChat('General');
                setChannelId(res.channel_id);
                fetchChannels();
            } catch (err) {
                setError('Failed to join chat: ' + err);
            }
        };
        initChat();
    }, []);

    const fetchChannels = async () => {
        if (!user.session_id) return;
        try {
            const res = await api.getChannels(user.session_id);
            setChannels(res);
        } catch (err) {
            console.error("Fetch channels error", err);
        }
    };

    // ... (keep checkIfAtBottom and handleScroll)

    // Poll for messages and typing status
    useEffect(() => {
        if (!channelId) return;

        const fetchMessages = async () => {
            try {
                const res = await api.getMessages(channelId, user.session_id);
                if (res.messages) {
                    const sortedMessages = [...res.messages].reverse();
                    // ... (rest of message logic)
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
                if (res.online) setOnlineUsers(res.online);
                if (res.meeting) setActiveMeeting(res.meeting);
                else setActiveMeeting(null);
            } catch (err) {
                console.error("Presence error", err);
            }
        };

        fetchMessages();
        fetchPresence();
        fetchChannels(); // Refresh channel list periodically
        const msgInterval = setInterval(fetchMessages, 2000);
        const presenceInterval = setInterval(fetchPresence, 10000);

        return () => {
            clearInterval(msgInterval);
            clearInterval(presenceInterval);
        };
    }, [channelId, user.session_id]);

    const handleCreateGroup = async () => {
        const groupName = prompt('Enter Group Name:');
        if (!groupName) return;
        const membersInput = prompt('Enter member usernames (comma separated):');
        const members = membersInput ? membersInput.split(',').map(m => m.trim()) : [];

        try {
            const res = await api.createGroup(groupName, members, user.session_id);
            setChannelId(res.id);
            fetchChannels();
        } catch (err) {
            alert('Error creating group: ' + err);
        }
    };

    const handleDeleteGroup = async (cid) => {
        if (!window.confirm('Are you sure you want to delete this group?')) return;
        try {
            await api.deleteGroup(cid, user.session_id);
            if (channelId === cid) setChannelId(1);
            fetchChannels();
        } catch (err) {
            alert('Error deleting group: ' + err);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        try {
            await api.deleteMessage(channelId, msgId, user.session_id);
            // Local update for instant feel
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            alert('Cannot delete: ' + err);
        }
    };

    // Voice recording FIX
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Audio = reader.result;
                    try {
                        await api.postMessage(channelId, `[VOICE]${base64Audio}`, user.session_id);
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
            setError('Microphone access denied or not supported');
        }
    };

    // ... (keep handleSend, renderMessage update below)

    const renderMessage = (msg) => {
        const isMine = msg.author === user.name;
        const isAdmin = channels.find(c => c.id === channelId)?.is_admin;

        const deleteBtn = (isMine || isAdmin) && (
            <button onClick={() => handleDeleteMessage(msg.id)} className="delete-msg-btn" title="Delete Message">🗑️</button>
        );

        let content;
        if (msg.body.startsWith('[IMAGE]')) {
            content = <img src={msg.body.substring(7)} alt="Shared" className="shared-img" />;
        } else if (msg.body.startsWith('[VOICE]')) {
            content = <audio controls className="shared-audio"><source src={msg.body.substring(7)} type="audio/webm" /></audio>;
        } else {
            content = <span>{String(msg.body).replace(/<[^>]+>/g, '')}</span>;
        }

        return (
            <div key={msg.id} className={`message-wrapper ${isMine ? 'mine' : 'others'}`}>
                <div className="message">
                    <span className="message-author">{msg.author}</span>
                    <div className="message-content">
                        {content}
                        {deleteBtn}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="card chat-room-card monolith-layout">
            <div className="sidebar-groups">
                <div className="sidebar-header">
                    <h3>Groups</h3>
                    <button onClick={handleCreateGroup} className="add-group-btn">+</button>
                </div>
                <div className="groups-list">
                    {channels.map(c => (
                        <div key={c.id} className={`group-item ${channelId === c.id ? 'active' : ''}`} onClick={() => setChannelId(c.id)}>
                            <span>{c.name}</span>
                            {c.is_admin && c.id !== 1 && <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(c.id); }} className="del-grp-small">×</button>}
                        </div>
                    ))}
                </div>
                <div className="sidebar-footer">
                    <h4>Online Friends</h4>
                    <div className="presence-min">
                        {onlineUsers.map(name => <div key={name} className="online-user"><span className="status-dot"></span>{name}</div>)}
                    </div>
                    <button onClick={onLogout} className="logout-side-btn">Logout</button>
                </div>
            </div>

            <div className="main-chat-container">
                <div className="chat-header-minimal">
                    <h2>{channels.find(c => c.id === channelId)?.name || 'Loading...'}</h2>
                    <div className="header-actions-mini">
                        <button onClick={startMeeting} className="mini-action">🎥 Meeting</button>
                        <button onClick={watchTogether} className="mini-action">🍿 Watch</button>
                    </div>
                </div>

                <div className="messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
                    {messages.map(renderMessage)}
                    {typingUsers.length > 0 && <div className="typing-indicator">{typingUsers.join(', ')} typing...</div>}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-area" onSubmit={handleSend}>
                    <label className="icon-button">📷<input type="file" onChange={handleFileSelect} hidden /></label>
                    <button type="button" className={`icon-button ${isRecording ? 'recording' : ''}`}
                        onMouseDown={startRecording} onMouseUp={stopRecording}>🎤</button>
                    <input type="text" placeholder="Type a message..." value={inputVal} onChange={handleInputChange} />
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
};

export default ChatRoom;
