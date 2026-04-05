import React, { useState } from 'react';
import axios from 'axios';

const Chat = () => {
    const [question, setQuestion] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const handleAsk = async () => {
        if (!question.trim()) return;
        setLoading(true);
        setResponse(null);
        try {
            const API_BASE = process.env.REACT_APP_API_URL || '';
            const res = await axios.post(`${API_BASE}/api/chat`, { question });
            setResponse(res.data);
        } catch (err) {
            setResponse({ error: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2 style={{ color: '#E0E0FF', marginBottom: '16px' }}>Ask AI Assistant</h2>
            <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about plants, diseases, treatments..."
                rows="3"
                className="input-neon"
                style={{ marginBottom: '12px' }}
            />
            <button 
                onClick={handleAsk} 
                disabled={loading}
                className="btn-glow"
                style={{ width: '100%' }}
            >
                {loading ? <span className="spinner-glow" style={{ display: 'inline-block', width: '20px', height: '20px' }}></span> : 'Ask'}
            </button>

            {response && (
                <div style={{ marginTop: '24px' }}>
                    {response.error ? (
                        <div style={{ color: '#ff6b6b', padding: '12px', background: 'rgba(255,0,0,0.1)', borderRadius: '12px' }}>
                            Error: {response.error}
                        </div>
                    ) : (
                        <>
                            <div className="glass-panel" style={{ padding: '16px' }}>
                                <strong style={{ color: '#7C3AED' }}>Answer:</strong>
                                <p style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>{response.answer}</p>
                            </div>

                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="btn-glow"
                                style={{ marginTop: '12px', padding: '8px 16px', fontSize: '0.9rem' }}
                            >
                                {showDetails ? 'Hide details' : 'Show details'}
                            </button>

                            {showDetails && (
                                <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(10,10,20,0.8)', borderRadius: '12px' }}>
                                    <h4 style={{ color: '#EC4899' }}>Generated SPARQL:</h4>
                                    <pre style={{ whiteSpace: 'pre-wrap', background: '#1A1A2E', padding: '12px', borderRadius: '8px', color: '#B0B0FF' }}>
                                        {response.sparql}
                                    </pre>
                                    <h4 style={{ color: '#EC4899', marginTop: '16px' }}>Raw Results:</h4>
                                    <pre style={{ whiteSpace: 'pre-wrap', background: '#1A1A2E', padding: '12px', borderRadius: '8px', maxHeight: '300px', overflow: 'auto', color: '#B0B0FF' }}>
                                        {JSON.stringify(response.results, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Chat;