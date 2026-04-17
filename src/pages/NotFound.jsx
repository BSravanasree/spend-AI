import React from 'react';

export default function NotFound() {
    return (
        <div style={{
            background: '#080809',
            color: '#f0f0ee',
            height: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            gap: '16px',
            textAlign: 'center'
        }}>
            <div style={{
                fontSize: '120px',
                fontWeight: '900',
                opacity: 0.05,
                position: 'absolute',
                zIndex: 0
            }}>
                404
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
                <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Page not found</h2>
                <p style={{ color: '#666', maxWidth: '400px', margin: '0 0 24px 0' }}>
                    This page does not exist or you do not have access to view it.
                </p>
                <a href="/dashboard" style={{
                    background: '#5b6af7',
                    color: 'white',
                    padding: '12px 32px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    boxShadow: '0 10px 20px -5px rgba(91, 106, 247, 0.4)',
                    transition: 'transform 0.2s ease'
                }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    Back to Dashboard
                </a>
            </div>
        </div>
    );
}
