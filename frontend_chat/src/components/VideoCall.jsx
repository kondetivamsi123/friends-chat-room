import React, { useRef, useEffect, useState } from 'react';

const VideoCall = ({ channelId, user, onClose, isAudioOnly = false }) => {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(isAudioOnly);
    const [participants, setParticipants] = useState([]);
    const localVideoRef = useRef(null);
    const remoteVideosRef = useRef({});
    const localStreamRef = useRef(null);
    const peerConnectionsRef = useRef({});

    useEffect(() => {
        initializeCall();
        return () => {
            cleanup();
        };
    }, []);

    const initializeCall = async () => {
        try {
            // Get user media
            const constraints = {
                audio: true,
                video: !isAudioOnly ? { width: 1280, height: 720 } : false
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // In a real implementation, you would:
            // 1. Connect to a signaling server (WebSocket)
            // 2. Exchange ICE candidates and SDP offers/answers
            // 3. Establish peer-to-peer connections

            // For now, we'll show the local stream
            console.log('Call initialized with stream:', stream);
        } catch (err) {
            console.error('Error accessing media devices:', err);
            alert('Could not access camera/microphone. Please check permissions.');
        }
    };

    const cleanup = () => {
        // Stop all tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        // Close all peer connections
        Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
            }
        }
    };

    const endCall = () => {
        cleanup();
        onClose();
    };

    return (
        <div className="video-call-overlay">
            <div className="video-call-container">
                <div className="video-call-header">
                    <h3>📞 Call in Progress</h3>
                    <button onClick={endCall} className="close-call-btn">✕</button>
                </div>

                <div className="video-grid">
                    {/* Local Video */}
                    <div className="video-participant local">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className={isVideoOff ? 'video-off' : ''}
                        />
                        {isVideoOff && (
                            <div className="video-placeholder">
                                <div className="avatar-placeholder">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        )}
                        <div className="participant-name">You {isMuted && '🔇'}</div>
                    </div>

                    {/* Remote Videos - In real implementation, map through participants */}
                    {participants.length === 0 && (
                        <div className="waiting-message">
                            <div className="spinner"></div>
                            <p>Waiting for others to join...</p>
                        </div>
                    )}
                </div>

                <div className="call-controls">
                    <button
                        onClick={toggleMute}
                        className={`control-btn ${isMuted ? 'active' : ''}`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? '🔇' : '🎤'}
                    </button>

                    {!isAudioOnly && (
                        <button
                            onClick={toggleVideo}
                            className={`control-btn ${isVideoOff ? 'active' : ''}`}
                            title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                        >
                            {isVideoOff ? '📹' : '🎥'}
                        </button>
                    )}

                    <button
                        onClick={endCall}
                        className="control-btn end-call"
                        title="End call"
                    >
                        📞
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VideoCall;
