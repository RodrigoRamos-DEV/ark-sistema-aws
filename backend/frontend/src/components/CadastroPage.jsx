import React, { useState, useEffect } from 'react';
import CadastroNavbar from './CadastroNavbar';
import ProdutoManager from './ProdutoManager';
import ClienteManager from './ClienteManager';
import FornecedorManager from './FornecedorManager';
import FuncionarioManager from './FuncionarioManager';




// Componente Modal genérico
const ManagementModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    
    return (
        <div 
            style={{
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(0,0,0,0.7)', 
                zIndex: 9999, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: '20px'
            }}
        >
            <div 
                style={{
                    width: '95%', 
                    maxWidth: '1200px', 
                    minHeight: '400px',
                    maxHeight: '90vh', 
                    overflowY: 'auto', 
                    position: 'relative',
                    transform: 'scale(1)',
                    transition: 'all 0.3s ease'
                }} 
                className="card"

            >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--cor-borda)', paddingBottom: '15px'}}>
                    <h2 style={{margin: 0, color: 'var(--cor-primaria)'}}>{title}</h2>
                    <button 
                        onClick={onClose} 
                        style={{
                            background: 'none', 
                            border: 'none', 
                            fontSize: '1.8em', 
                            cursor: 'pointer', 
                            color: 'var(--cor-texto)',
                            padding: '5px 10px',
                            borderRadius: '50%',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--cor-hover)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        ×
                    </button>
                </div>
                <div style={{minHeight: '300px'}}>
                    {children}
                </div>
            </div>
        </div>
    );
};

function CadastroPage() {
  const [modalState, setModalState] = useState({ isOpen: false, type: '', title: '' });

  useEffect(() => {
    const handleOpenModal = (event) => {
      const { type } = event.detail;
      handleNavClick(type);
    };

    window.addEventListener('openModal', handleOpenModal);
    return () => window.removeEventListener('openModal', handleOpenModal);
  }, []);

  const handleNavClick = (type) => {
    const titles = {
      produtos: 'Produtos',
      clientes: 'Clientes',
      fornecedores: 'Fornecedores', 
      funcionarios: 'Funcionários'
    };
    setModalState({ isOpen: true, type, title: titles[type] });
  };

  const closeModal = () => {
    // Forçar reset completo do modal
    setModalState({ isOpen: false, type: '', title: '' });
    
    // Garantir que o DOM seja limpo
    setTimeout(() => {
      const modals = document.querySelectorAll('[style*="position: fixed"]');
      modals.forEach(modal => {
        if (modal.style.zIndex === '9999') {
          modal.style.transform = 'scale(1)';
        }
      });
    }, 100);
  };

  const renderModalContent = () => {
      const { type } = modalState;
      switch(type) {
        case 'produtos':
          return <ProdutoManager />;
        case 'funcionarios':
          return <FuncionarioManager />;
        case 'clientes':
          return <ClienteManager />;
        case 'fornecedores':
          return <FornecedorManager />;

        default:
          return null;
      }
  };

  return (
    <div>
      <CadastroNavbar 
        onItemClick={handleNavClick}
        activeItem={modalState.isOpen ? modalState.type : null}
      />
      
      <div className="card" style={{textAlign: 'center', padding: '40px'}}>
        <h3 style={{color: 'var(--cor-texto-secundario)', marginBottom: '10px'}}>Sistema de Cadastros</h3>
        <p style={{color: 'var(--cor-texto-secundario)'}}>Selecione uma opção acima para gerenciar seus cadastros</p>
      </div>

      <ManagementModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
      >
        {renderModalContent()}
      </ManagementModal>
    </div>
  );
}

export default CadastroPage;