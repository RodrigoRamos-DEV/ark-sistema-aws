import React from 'react';

const TabNavigation = ({ activeTab, onTabChange, vendasCount, comprasCount }) => {
  const tabs = [
    { id: 'vendas', label: 'Vendas', icon: '💰', count: vendasCount, color: '#28a745' },
    { id: 'compras', label: 'Compras', icon: '🛒', count: comprasCount, color: '#dc3545' }
  ];

  return (
    <div style={{
      display: 'flex',
      borderBottom: '2px solid var(--cor-borda)',
      marginBottom: '20px',
      gap: '5px'
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
            backgroundColor: activeTab === tab.id ? `${tab.color}15` : 'transparent',
            color: activeTab === tab.id ? tab.color : 'var(--cor-texto)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
            transition: 'all 0.3s ease'
          }}
        >
          <span style={{fontSize: '18px'}}>{tab.icon}</span>
          <span>{tab.label}</span>
          {tab.count > 0 && (
            <span style={{
              backgroundColor: tab.color,
              color: 'white',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;