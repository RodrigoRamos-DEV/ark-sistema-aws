import React from 'react';

const OnlineStatusLED = ({ isOnline, size = 12 }) => {
    const ledStyle = {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: isOnline ? '#4CAF50' : '#f44336',
        boxShadow: isOnline 
            ? '0 0 8px rgba(76, 175, 80, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3)' 
            : '0 0 8px rgba(244, 67, 54, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: isOnline ? 'pulse-green 2s infinite' : 'none',
        display: 'inline-block',
        position: 'relative'
    };

    return (
        <>
            <style>
                {`
                    @keyframes pulse-green {
                        0% { box-shadow: 0 0 8px rgba(76, 175, 80, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3); }
                        50% { box-shadow: 0 0 15px rgba(76, 175, 80, 0.9), inset 0 1px 2px rgba(255, 255, 255, 0.3); }
                        100% { box-shadow: 0 0 8px rgba(76, 175, 80, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.3); }
                    }
                `}
            </style>
            <div 
                style={ledStyle}
                title={isOnline ? 'Online' : 'Offline'}
            />
        </>
    );
};

export default OnlineStatusLED;