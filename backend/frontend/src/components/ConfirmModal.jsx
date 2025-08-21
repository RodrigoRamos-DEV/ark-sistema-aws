import React from 'react';
import { Icons } from './Icons';

function ConfirmModal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) {
    return null;
  }

  // Estilos para o modal
  const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1001, // zIndex maior que o outro modal
    display: 'flex', justifyContent: 'center', alignItems: 'center'
  };

  const modalContentStyle = {
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center'
  };

  const buttonContainerStyle = {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
    gap: '15px'
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} className="card" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{title || 'Confirmar Ação'}</h3>
        <p>{children}</p>
        <div style={buttonContainerStyle}>
          <button onClick={onClose} className="btn" style={{ backgroundColor: '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icons.Cancel /> Cancelar
          </button>
          <button onClick={onConfirm} className="btn" style={{ backgroundColor: 'var(--cor-erro)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icons.Check /> Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;