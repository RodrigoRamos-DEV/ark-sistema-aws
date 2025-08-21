import React from 'react';

const CadastroNavbar = ({ onItemClick, activeItem }) => {
  const menuItems = [
    { 
      id: 'produtos', 
      label: 'Produtos', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
          <path d="M3.29 7 12 12l8.71-5"/>
          <path d="M12 22V12"/>
        </svg>
      )
    },
    { 
      id: 'clientes', 
      label: 'Clientes', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    { 
      id: 'fornecedores', 
      label: 'Fornecedores', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
          <path d="M6 12h4"/>
          <path d="M6 16h4"/>
          <path d="M16 6h2"/>
          <path d="M16 10h2"/>
          <path d="M16 14h2"/>
          <path d="M16 18h2"/>
        </svg>
      )
    },
    { 
      id: 'funcionarios', 
      label: 'Funcionários', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--cor-fundo-card)',
      borderBottom: '1px solid var(--cor-borda)',
      padding: '10px 0',
      marginBottom: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '30px',
        flexWrap: 'wrap'
      }}>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onItemClick(item.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '20px 25px',
              border: activeItem === item.id ? '2px solid var(--cor-primaria)' : '2px solid var(--cor-borda)',
              borderRadius: '12px',
              backgroundColor: activeItem === item.id ? 'var(--cor-primaria)' : 'var(--cor-card)',
              color: activeItem === item.id ? 'white' : 'var(--cor-texto)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '100px',
              boxShadow: activeItem === item.id ? '0 4px 12px rgba(109, 40, 217, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
              transform: 'translateY(0)'
            }}
            onMouseEnter={(e) => {
              if (activeItem !== item.id) {
                e.target.style.backgroundColor = 'rgba(109, 40, 217, 0.1)';
                e.target.style.borderColor = 'var(--cor-primaria)';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeItem !== item.id) {
                e.target.style.backgroundColor = 'var(--cor-card)';
                e.target.style.borderColor = 'var(--cor-borda)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }
            }}
          >
            <div style={{ fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {item.icon}
            </div>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CadastroNavbar;