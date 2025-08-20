import React from 'react';

const DashboardCards = ({ transactions, filters }) => {
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.transaction_date);
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;
    
    if (startDate && transactionDate < startDate) return false;
    if (endDate && transactionDate > endDate) return false;
    
    return true;
  });

  const vendas = filteredTransactions.filter(t => t.type === 'venda');
  const compras = filteredTransactions.filter(t => t.type === 'gasto');
  
  const totalVendas = vendas.reduce((sum, t) => sum + parseFloat(t.total_price || 0), 0);
  const totalCompras = compras.reduce((sum, t) => sum + parseFloat(t.total_price || 0), 0);
  const saldo = totalVendas - totalCompras;

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);

  const cardStyle = {
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    minWidth: '150px'
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '15px',
      marginBottom: '20px'
    }}>
      <div className="card" style={{...cardStyle, borderLeft: '4px solid #28a745'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/>
            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
          </svg>
          <h4 style={{margin: 0, color: '#28a745'}}>Total Vendas</h4>
        </div>
        <p style={{fontSize: '1.5em', fontWeight: 'bold', margin: 0, color: '#28a745'}}>
          {formatCurrency(totalVendas)}
        </p>
        <small>{vendas.length} lançamentos</small>
      </div>

      <div className="card" style={{...cardStyle, borderLeft: '4px solid #dc3545'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <h4 style={{margin: 0, color: '#dc3545'}}>Total Compras</h4>
        </div>
        <p style={{fontSize: '1.5em', fontWeight: 'bold', margin: 0, color: '#dc3545'}}>
          {formatCurrency(totalCompras)}
        </p>
        <small>{compras.length} lançamentos</small>
      </div>

      <div className="card" style={{...cardStyle, borderLeft: `4px solid ${saldo >= 0 ? '#28a745' : '#dc3545'}`}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={saldo >= 0 ? '#28a745' : '#dc3545'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <h4 style={{margin: 0, color: saldo >= 0 ? '#28a745' : '#dc3545'}}>Saldo</h4>
        </div>
        <p style={{fontSize: '1.5em', fontWeight: 'bold', margin: 0, color: saldo >= 0 ? '#28a745' : '#dc3545'}}>
          {formatCurrency(saldo)}
        </p>
        <small>{saldo >= 0 ? 'Lucro' : 'Prejuízo'}</small>
      </div>

      <div className="card" style={{...cardStyle, borderLeft: '4px solid #007bff'}}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007bff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <h4 style={{margin: 0, color: '#007bff'}}>Total Lançamentos</h4>
        </div>
        <p style={{fontSize: '1.5em', fontWeight: 'bold', margin: 0, color: '#007bff'}}>
          {filteredTransactions.length}
        </p>
        <small>No período</small>
      </div>
    </div>
  );
};

export default DashboardCards;