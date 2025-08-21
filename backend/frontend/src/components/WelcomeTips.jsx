import React, { useState, useEffect } from 'react';

function WelcomeTips() {
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const hasSeenTips = localStorage.getItem('hasSeenKeyboardTips');
    if (!hasSeenTips) {
      setTimeout(() => setShowTips(true), 2000); // Mostrar após 2 segundos
    }
  }, []);

  const handleClose = () => {
    setShowTips(false);
    localStorage.setItem('hasSeenKeyboardTips', 'true');
  };

  if (!showTips) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'var(--cor-primaria)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 9998,
      maxWidth: '300px',
      animation: 'slideIn 0.5s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>💡 Dica Rápida</div>
          <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
            Use <strong>Ctrl+K</strong> para busca rápida ou clique no <strong>❓</strong> para ver todos os atalhos!
          </div>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            marginLeft: '10px'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default WelcomeTips;