import React, { useState } from 'react';
import Login from './components/Login';
import MFAVerify from './components/MFAVerify';
import ChatRoom from './components/ChatRoom';
import CapTable from './components/CapTable';
import './index.css';

function App() {
  const [step, setStep] = useState('login'); // login | mfa | chat
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setStep('chat');
  };

  const handleMfaRequired = (userData) => {
    setUser(userData);
    setStep('mfa');
  };

  const handleMfaSuccess = () => {
    setStep('chat');
  };

  const handleLogout = () => {
    setUser(null);
    setStep('login');
    // Clear any room session info if needed
    localStorage.removeItem('chat_session');
  };

  return (
    <div className="App">
      {step === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onMfaRequired={handleMfaRequired}
        />
      )}

      {step === 'mfa' && (
        <MFAVerify
          onVerifySuccess={handleMfaSuccess}
        />
      )}

      {step === 'chat' && user && (
        <ChatRoom
          user={user}
          onLogout={handleLogout}
          onOpenDao={() => setStep('dao')}
        />
      )}

      {step === 'dao' && user && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setStep('chat')}
            style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, background: '#333' }}
          >
            ← Back to Chat
          </button>
          <CapTable user={user} />
        </div>
      )}
    </div>
  );
}

export default App;
