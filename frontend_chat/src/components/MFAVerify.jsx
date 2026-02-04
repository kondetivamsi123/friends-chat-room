import React, { useState } from 'react';
import { api } from '../services/api';

const MFAVerify = ({ onVerifySuccess }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await api.verifyMFA(code);

            if (result.error) {
                setError(result.error);
            } else if (result.status === 'success') {
                onVerifySuccess();
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h1>Security Verification</h1>
            <h2>Enter your 6-digit code</h2>

            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={6}
                    required
                    style={{ letterSpacing: '0.2rem', textAlign: 'center', fontSize: '1.2rem' }}
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify Code'}
                </button>
            </form>
        </div>
    );
};

export default MFAVerify;
