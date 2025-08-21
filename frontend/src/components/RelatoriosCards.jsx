import React from 'react';

const RelatoriosCards = ({ summary, filteredTransactions, previousPeriodData }) => {
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value || 0);

  const vendas = filteredTransactions.filter(t => t.type === 'venda');
  const compras = filteredTransactions.filter(t => t.type === 'gasto');
  
  const ticketMedio = vendas.length > 0 ? summary.ganhos / vendas.length : 0;
  const margemLucro = summary.ganhos > 0 ? ((summary.saldo / summary.ganhos) * 100) : 0;
  
  const crescimentoVendas = previousPeriodData ? 
    ((summary.ganhos - previousPeriodData.ganhos) / (previousPeriodData.ganhos || 1)) * 100 : 0;

  const cards = [
    {
      title: 'Total Vendas',
      value: formatCurrency(summary.ganhos),
      subtitle: `${vendas.length} transações`,
      color: '#28a745',
      trend: crescimentoVendas,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"/>
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
        </svg>
      )
    },
    {
      title: 'Total Compras',
      value: formatCurrency(summary.gastos),
      subtitle: `${compras.length} transações`,
      color: '#dc3545',
      trend: null,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      )
    },
    {
      title: 'Saldo',
      value: formatCurrency(summary.saldo),
      subtitle: summary.saldo >= 0 ? 'Lucro' : 'Prejuízo',
      color: summary.saldo >= 0 ? '#28a745' : '#dc3545',
      trend: null,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={summary.saldo >= 0 ? '#28a745' : '#dc3545'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      )
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(ticketMedio),
      subtitle: 'Por venda',
      color: '#17a2b8',
      trend: null,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#17a2b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      )
    },
    {
      title: 'Margem de Lucro',
      value: `${margemLucro.toFixed(1)}%`,
      subtitle: 'Sobre vendas',
      color: margemLucro >= 20 ? '#28a745' : margemLucro >= 10 ? '#ffc107' : '#dc3545',
      trend: null,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={margemLucro >= 20 ? '#28a745' : margemLucro >= 10 ? '#ffc107' : '#dc3545'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
        </svg>
      )
    },
    {
      title: 'Total Transações',
      value: filteredTransactions.length.toString(),
      subtitle: 'No período',
      color: '#6f42c1',
      trend: null,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6f42c1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      )
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    }}>
      {cards.map((card, index) => (
        <div key={index} className="card" style={{
          padding: '20px',
          textAlign: 'center',
          borderLeft: `4px solid ${card.color}`,
          position: 'relative'
        }}>
          <div style={{fontSize: '24px', marginBottom: '8px', display: 'flex', justifyContent: 'center', color: card.color}}>
            {card.icon}
          </div>
          <h4 style={{margin: '0 0 8px 0', color: card.color, fontSize: '14px'}}>{card.title}</h4>
          <p style={{fontSize: '1.5em', fontWeight: 'bold', margin: '0 0 5px 0', color: card.color}}>
            {card.value}
          </p>
          <small style={{color: 'var(--cor-texto-secundario)'}}>{card.subtitle}</small>
          
          {card.trend !== null && (
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              fontSize: '12px',
              color: card.trend >= 0 ? '#28a745' : '#dc3545',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={card.trend >= 0 ? '#28a745' : '#dc3545'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {card.trend >= 0 ? (
                  <path d="M7 17L17 7M17 7H7M17 7V17"/>
                ) : (
                  <path d="M17 7L7 17M7 17H17M7 17V7"/>
                )}
              </svg>
              {Math.abs(card.trend).toFixed(1)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RelatoriosCards;