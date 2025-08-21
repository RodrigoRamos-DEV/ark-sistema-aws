import React, { useState, useEffect } from 'react';

let dialogId = 0;
const dialogs = [];
const listeners = [];

export const showConfirmDialog = (title, message, onConfirm, onCancel = null) => {
  const id = ++dialogId;
  const dialog = { id, title, message, onConfirm, onCancel };
  dialogs.push(dialog);
  
  listeners.forEach(listener => listener([...dialogs]));
};

function ConfirmDialog() {
  const [dialogList, setDialogList] = useState([]);

  useEffect(() => {
    const listener = (newDialogs) => setDialogList(newDialogs);
    listeners.push(listener);
    
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  const removeDialog = (id) => {
    const index = dialogs.findIndex(d => d.id === id);
    if (index > -1) {
      dialogs.splice(index, 1);
      setDialogList([...dialogs]);
    }
  };

  const handleConfirm = (dialog) => {
    if (dialog.onConfirm) dialog.onConfirm();
    removeDialog(dialog.id);
  };

  const handleCancel = (dialog) => {
    if (dialog.onCancel) dialog.onCancel();
    removeDialog(dialog.id);
  };

  if (dialogList.length === 0) return null;

  return (
    <>
      {dialogList.map(dialog => (
        <div
          key={dialog.id}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => handleCancel(dialog)}
        >
          <div
            style={{
              background: 'var(--cor-fundo-card)',
              border: '1px solid var(--cor-borda)',
              borderRadius: '10px',
              padding: '25px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              marginBottom: '15px',
              color: 'var(--cor-texto)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '24px' }}>⚠️</span>
              {dialog.title}
            </div>
            
            <div style={{ 
              marginBottom: '25px', 
              color: 'var(--cor-texto-secundario)',
              lineHeight: '1.5'
            }}>
              {dialog.message}
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => handleCancel(dialog)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--cor-borda)',
                  borderRadius: '5px',
                  background: 'var(--cor-fundo)',
                  color: 'var(--cor-texto)',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirm(dialog)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '5px',
                  background: '#dc3545',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default ConfirmDialog;