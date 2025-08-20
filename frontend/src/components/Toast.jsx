import React, { useState, useEffect } from 'react';

let toastId = 0;
const toasts = [];
const listeners = [];

export const showToast = (message, type = 'info', duration = 3000) => {
  const id = ++toastId;
  const toast = { id, message, type, duration };
  toasts.push(toast);
  
  listeners.forEach(listener => listener([...toasts]));
  
  setTimeout(() => {
    const index = toasts.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      listeners.forEach(listener => listener([...toasts]));
    }
  }, duration);
};

function Toast() {
  const [toastList, setToastList] = useState([]);

  useEffect(() => {
    const listener = (newToasts) => setToastList(newToasts);
    listeners.push(listener);
    
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  const removeToast = (id) => {
    const index = toasts.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      setToastList([...toasts]);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'warning': return '#ffc107';
      default: return '#17a2b8';
    }
  };

  if (toastList.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {toastList.map(toast => (
        <div
          key={toast.id}
          style={{
            background: 'var(--cor-fundo-card)',
            border: `2px solid ${getColor(toast.type)}`,
            borderRadius: '8px',
            padding: '12px 16px',
            minWidth: '300px',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--cor-texto)'
          }}
        >
          <span style={{ fontSize: '16px' }}>{getIcon(toast.type)}</span>
          <span style={{ flex: 1, fontSize: '14px' }}>{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--cor-texto-secundario)',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toast;