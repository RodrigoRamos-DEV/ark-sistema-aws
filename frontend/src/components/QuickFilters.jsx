import React from 'react';

const QuickFilters = ({ onFilterChange }) => {
  const today = new Date().toISOString().split('T')[0];
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);

  const quickFilters = [
    { 
      label: 'Hoje', 
      action: () => onFilterChange({ startDate: today, endDate: today })
    },
    { 
      label: 'Esta Semana', 
      action: () => onFilterChange({ 
        startDate: thisWeekStart.toISOString().split('T')[0], 
        endDate: today 
      })
    },
    { 
      label: 'Este Mês', 
      action: () => onFilterChange({ 
        startDate: thisMonthStart.toISOString().split('T')[0], 
        endDate: today 
      })
    },
    { 
      label: 'Limpar', 
      action: () => onFilterChange({ startDate: '', endDate: '' })
    }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '10px',
      marginBottom: '15px',
      flexWrap: 'wrap'
    }}>
      <span style={{
        alignSelf: 'center',
        fontWeight: 'bold',
        color: 'var(--cor-texto-secundario)'
      }}>
        Filtros Rápidos:
      </span>
      {quickFilters.map((filter, index) => (
        <button
          key={index}
          onClick={filter.action}
          style={{
            padding: '6px 12px',
            border: '1px solid var(--cor-borda)',
            borderRadius: '20px',
            backgroundColor: 'transparent',
            color: 'var(--cor-texto)',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'var(--cor-primaria)';
            e.target.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = 'var(--cor-texto)';
          }}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default QuickFilters;