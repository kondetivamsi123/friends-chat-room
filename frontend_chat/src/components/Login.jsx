import React, { useState } from 'react';
import { api } from '../services/api';

const Login = ({ onLoginSuccess, onMfaRequired }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await api.login(username, password);

            if (result.error) {
                setError(result.error);
            } else if (result.status === 'mfa_required') {
                onMfaRequired(result);
            } else if (result.status === 'success') {
                onLoginSuccess(result);
            }
        } catch (err) {
            setError(err); // api.js now throws string messages mostly
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h1>Friends Chat Room</h1>
            <h2>Welcome! Please login to continue</h2>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username / Email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Logging in...' : 'Sign In'}
                </button>
            </form>
        </div>
    );
};

export default Login;
