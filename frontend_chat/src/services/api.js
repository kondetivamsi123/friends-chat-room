import axios from 'axios';

// Simplified API service for Python Backend
const getBaseURL = () => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return 'http://localhost:8069';
    }
    return 'https://friends-chat-room.onrender.com';
};

const client = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
    },
});

const callApi = async (endpoint, data = {}) => {
    try {
        console.log(`POST ${endpoint}`, data);
        const response = await client.post(endpoint, data);

        // Check for application-level error (legacy Odoo style or new style)
        if (response.data.error) {
            const errorObj = response.data.error;
            const msg = (errorObj.data && errorObj.data.message)
                ? errorObj.data.message
                : (errorObj.message || "Unknown Error");
            throw new Error(msg);
        }

        // Support both { result: ... } wrapper and direct response
        return response.data.result || response.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error.response?.data?.message || error.message || "Network Error";
    }
};

export const api = {
    login: (login, password) => callApi('/api/auth/login', { login, password }),
    verifyMFA: (code) => callApi('/api/auth/mfa_verify', { code }),
    joinChat: (channelName) => callApi('/api/chat/join', { channel_name: channelName }),
    getMessages: (channelId) => callApi('/api/chat/messages', { channel_id: channelId }),
    postMessage: (channelId, body, sessionId) => callApi('/api/chat/post', { channel_id: channelId, body, session_id: sessionId }),
    setTyping: (channelId, isTyping, sessionId) => callApi('/api/chat/typing', { channel_id: channelId, is_typing: isTyping, session_id: sessionId }),
    getPresence: (sessionId, channelId) => callApi('/api/chat/presence', { session_id: sessionId, channel_id: channelId }),
    startMeeting: (channelId, url, sessionId) => callApi('/api/chat/meeting/start', { channel_id: channelId, url, session_id: sessionId }),
};
