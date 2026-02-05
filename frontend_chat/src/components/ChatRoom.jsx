import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const ChatRoom = ({ user, onLogout, onOpenDao }) => {
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
            if (Array.isArray(res)) setChannels(res);
        } catch (err) {
            console.error("Fetch channels error", err);
        }
    };

    const checkIfAtBottom = () => {
        if (!messagesAreaRef.current) return true;
        const { scrollTop, scrollHeight, clientHeight } = messagesAreaRef.current;
        return scrollHeight - scrollTop - clientHeight < 50;
    };

    const handleScroll = () => {
        const atBottom = checkIfAtBottom();
        setIsAtBottom(atBottom);
        if (atBottom && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            localStorage.setItem(`lastReadMessageId_${channelId}`, lastMsg.id);
            setUnreadCount(0);
        }
    };

    // Poll for messages and typing status
    useEffect(() => {
        if (!channelId) return;

        const fetchMessages = async () => {
            try {
                const res = await api.getMessages(channelId, user.session_id);
                if (res.messages) {
                    const sortedMessages = [...res.messages].reverse();

                    if (messages.length === 0 && sortedMessages.length > 0) {
                        setMessages(sortedMessages);

                        // Handle initial scroll
                        setTimeout(() => {
                            const lastReadId = parseInt(localStorage.getItem(`lastReadMessageId_${channelId}`));
                            if (lastReadId) {
                                const targetMsg = document.getElementById(`msg-${lastReadId}`);
                                if (targetMsg) {
                                    targetMsg.scrollIntoView({ behavior: 'auto', block: 'center' });
                                    // If we are looking at old messages, we are not at bottom
                                    setIsAtBottom(false);
                                } else {
                                    // Message not found (maybe too old), scroll to bottom
                                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                                    // Update last read to current latest
                                    localStorage.setItem(`lastReadMessageId_${channelId}`, sortedMessages[sortedMessages.length - 1].id);
                                }
                            } else {
                                // No history, scroll to bottom
                                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                                localStorage.setItem(`lastReadMessageId_${channelId}`, sortedMessages[sortedMessages.length - 1].id);
                            }
                        }, 100);

                        lastMessageIdRef.current = sortedMessages[sortedMessages.length - 1].id;
                        return;
                    }

                    if (sortedMessages.length > 0) {
                        const latestId = sortedMessages[sortedMessages.length - 1].id;
                        if (lastMessageIdRef.current && latestId > lastMessageIdRef.current) {
                            if (!isAtBottom) setUnreadCount(prev => prev + 1);
                        }
                        lastMessageIdRef.current = latestId;
                    }
                    setMessages(sortedMessages);
                }
                if (res.typing) {
                    setTypingUsers(res.typing.filter(name => name !== user.name));
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
        const msgInterval = setInterval(fetchMessages, 2000);
        const presenceInterval = setInterval(fetchPresence, 5000);

        return () => {
            clearInterval(msgInterval);
            clearInterval(presenceInterval);
        };
    }, [channelId, user.session_id, isAtBottom]);

    useEffect(() => {
        if (messages.length > prevMessagesLengthRef.current) {
            if (isAtBottom || messages[messages.length - 1]?.author === user.name) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
            prevMessagesLengthRef.current = messages.length;
        }
    }, [messages, isAtBottom, user.name]);

    const handleInputChange = (e) => {
        setInputVal(e.target.value);
        if (user.session_id) {
            api.setTyping(channelId, true, user.session_id);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                api.setTyping(channelId, false, user.session_id);
            }, 3000);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputVal.trim()) return;
        const txt = inputVal;
        setInputVal('');
        try {
            await api.postMessage(channelId, txt, user.session_id);
        } catch (err) {
            setError('Failed to send: ' + err);
        }
    };

    const handleCreateGroup = async () => {
        const groupName = prompt('Enter Group Name:');
        if (!groupName) return;
        const membersInput = prompt('Enter members (comma separated):');
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
        if (!window.confirm('Delete this group?')) return;
        try {
            await api.deleteGroup(cid, user.session_id);
            if (channelId === cid) setChannelId(1);
            fetchChannels();
        } catch (err) {
            alert('Error: ' + err);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        try {
            await api.deleteMessage(channelId, msgId, user.session_id);
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            alert('Cannot delete: ' + err);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = async () => {
                    await api.postMessage(channelId, `[VOICE]${reader.result}`, user.session_id);
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            setError('Mic access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            await api.postMessage(channelId, `[IMAGE]${event.target.result}`, user.session_id);
        };
        reader.readAsDataURL(file);
    };

    const startMeeting = async () => {
        const url = `https://meet.jit.si/FriendsExp_${channelId}_${Date.now()}`;
        try {
            await api.startMeeting(channelId, url, user.session_id);
            window.open(url, '_blank');
            api.postMessage(channelId, `🎥 Video meeting: ${url}`, user.session_id);
        } catch (err) { alert(err); }
    };

    const watchTogether = () => {
        const url = prompt('YouTube URL:');
        if (url) api.postMessage(channelId, `[WATCH]${url}`, user.session_id);
    };

    const renderMessage = (msg) => {
        const isMine = msg.author === user.name;
        const isAdmin = channels.find(c => c.id === channelId)?.is_admin;
        const canDelete = isMine || isAdmin;

        let content;
        if (msg.body.startsWith('[IMAGE]')) {
            content = <img src={msg.body.substring(7)} className="shared-img" alt="shared" />;
        } else if (msg.body.startsWith('[VOICE]')) {
            content = <audio controls className="shared-audio"><source src={msg.body.substring(7)} /></audio>;
        } else if (msg.body.startsWith('[WATCH]')) {
            content = <div className="watch-card">🍿 Watch Together<br /><button onClick={() => window.open(msg.body.substring(7), '_blank')}>Open</button></div>;
        } else {
            content = <span>{String(msg.body).replace(/<[^>]+>/g, '')}</span>;
        }

        return (
            <div key={msg.id} id={`msg-${msg.id}`} className={`message-wrapper ${isMine ? 'mine' : 'others'}`}>
                <div className="message">
                    <span className="message-author">{msg.author}</span>
                    <div className="message-content">
                        {content}
                        {canDelete && <button onClick={() => handleDeleteMessage(msg.id)} className="delete-msg-btn">🗑️</button>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="monolith-layout">
            <div className={`sidebar-groups ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h3>Groups</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={handleCreateGroup} className="add-group-btn">+</button>
                        {isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="add-group-btn" style={{ background: '#333' }}>×</button>}
                    </div>
                </div>
                <div className="groups-list">
                    {channels.map(c => (
                        <div key={c.id} className={`group-item ${channelId === c.id ? 'active' : ''}`} onClick={() => { setChannelId(c.id); setIsSidebarOpen(false); }}>
                            <span>{c.name}</span>
                            {c.is_admin && c.id !== 1 && <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(c.id); }} className="del-grp-small">×</button>}
                        </div>
                    ))}
                </div>
                <div className="sidebar-footer">
                    <h4>Online</h4>
                    <div className="presence-min">
                        {onlineUsers.map(u => <div key={u} className="online-user"><span className="status-dot"></span>{u}</div>)}
                    </div>
                    <button onClick={onOpenDao} className="dao-side-btn">🏛️ DAO Equity</button>
                    <button onClick={onLogout} className="logout-side-btn">Logout</button>
                </div>
            </div>

            <div className={`main-chat-container ${isSidebarOpen ? 'hidden-mobile' : ''}`}>
                <div className="chat-header-minimal">
                    <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>☰</button>
                    <h2>{channels.find(c => c.id === channelId)?.name || 'Loading...'}</h2>
                    <div className="header-actions">
                        <button onClick={startMeeting} className="mini-action">🎥 Meeting</button>
                        <button onClick={watchTogether} className="mini-action">🍿 Watch</button>
                    </div>
                </div>

                <div className="messages-area" ref={messagesAreaRef} onScroll={handleScroll}>
                    {activeMeeting && activeMeeting.meeting_url && (
                        <div className="active-meeting-banner">
                            <span>🎥 <b>{activeMeeting.started_by}</b> started a meeting</span>
                            <button onClick={() => window.open(activeMeeting.meeting_url, '_blank')} className="join-meeting-btn">Join Now</button>
                        </div>
                    )}
                    {messages.map((msg, index) => {
                        const isLastRead = msg.id === parseInt(localStorage.getItem(`lastReadMessageId_${channelId}`));
                        const showDivider = isLastRead && index < messages.length - 1;

                        return (
                            <React.Fragment key={msg.id}>
                                {renderMessage(msg)}
                                {showDivider && (
                                    <div className="unread-divider">
                                        <span>Unread Messages</span>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                    {typingUsers.length > 0 && <div className="typing-indicator">{typingUsers.join(', ')} typing...</div>}
                    <div ref={messagesEndRef} />
                </div>

                {unreadCount > 0 && <div className="unread-badge" onClick={() => { setIsAtBottom(true); messagesEndRef.current?.scrollIntoView(); }}>{unreadCount} New ↓</div>}

                <form className="chat-input-area" onSubmit={handleSend}>
                    <label className="icon-button">📷<input type="file" onChange={handleFileSelect} hidden /></label>
                    <button type="button" onMouseDown={startRecording} onMouseUp={stopRecording} className={`icon-button ${isRecording ? 'recording' : ''}`}>🎤</button>
                    <input type="text" placeholder="Message..." value={inputVal} onChange={handleInputChange} />
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
};

export default ChatRoom;
