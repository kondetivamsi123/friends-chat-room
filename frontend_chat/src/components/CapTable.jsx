import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const CapTable = ({ user }) => {
    const [capTable, setCapTable] = useState([]);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);

    // Admin Form State
    const [awardUser, setAwardUser] = useState('');
    const [awardAmount, setAwardAmount] = useState('');
    const [awardReason, setAwardReason] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const tableRes = await api.getCapTable(user.session_id);
            setCapTable(tableRes.cap_table);

            // Only fetch summary if we don't have it (optional, could be on demand)
            const summaryRes = await api.getDaoSummary(user.session_id);
            if (summaryRes.summary) setSummary(summaryRes.summary);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAward = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.awardPoints(awardUser, awardAmount, awardReason, user.session_id);
            alert('Points Awarded!');
            setAwardUser('');
            setAwardAmount('');
            setAwardReason('');
            fetchData(); // Refresh table
        } catch (err) {
            alert('Error: ' + err);
        } finally {
            setLoading(false);
        }
    };

    const isAdmin = user.name === "Vamsi Krishna"; // Basic Admin Check

    return (
        <div className="dao-dashboard">
            <header className="dao-header">
                <h1>🏛️ DAO Cap Table</h1>
                <p>Track Ownership & Contributions</p>
            </header>

            <div className="dao-grid">
                {/* Cap Table Section */}
                <div className="card dao-card">
                    <h2>Founder Points Distribution</h2>
                    <table className="cap-table">
                        <thead>
                            <tr>
                                <th>Founder</th>
                                <th>Points</th>
                                <th>Equity %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {capTable.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.name}</td>
                                    <td>{row.shares.toLocaleString()}</td>
                                    <td>
                                        <div className="equity-bar-container">
                                            <div className="equity-bar" style={{ width: `${row.percentage}%` }}></div>
                                            <span>{row.percentage}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Admin Award Section */}
                {isAdmin && (
                    <div className="card dao-card">
                        <h2>🏆 Award Points</h2>
                        <form onSubmit={handleAward} className="award-form">
                            <input
                                type="text"
                                placeholder="User Email (e.g. Sai Prakash)"
                                value={awardUser}
                                onChange={e => setAwardUser(e.target.value)}
                                required
                            />
                            <input
                                type="number"
                                placeholder="Amount"
                                value={awardAmount}
                                onChange={e => setAwardAmount(e.target.value)}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Reason (e.g. Fixed Bug)"
                                value={awardReason}
                                onChange={e => setAwardReason(e.target.value)}
                                required
                            />
                            <button disabled={loading}>{loading ? 'Processing...' : 'Award Points'}</button>
                        </form>
                    </div>
                )}
            </div>

            {/* AI Summary Section */}
            <div className="card dao-card summary-card">
                <h2>🤖 Gemini Weekly Summary</h2>
                <div className="ai-content">
                    {summary ? (
                        <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }} />
                    ) : (
                        <p>Loading AI Analysis...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CapTable;
