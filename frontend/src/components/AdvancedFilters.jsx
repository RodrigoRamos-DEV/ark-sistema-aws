import React, { useState, useEffect } from 'react';

const AdvancedFilters = ({ onFiltersChange, initialFilters = {} }) => {
  const [filters, setFilters] = useState({
    dateRange: 'custom',
    startDate: '',
    endDate: '',
    amountMin: '',
    amountMax: '',
    status: [],
    employees: [],
    categories: [],
    products: [],
    paymentStatus: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
    ...initialFilters
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [savedFilters, setSavedFilters] = useState([]);

  useEffect(() => {
    loadSavedFilters();
  }, []);

  const loadSavedFilters = () => {
    const saved = localStorage.getItem('savedFilters');
    if (saved) {
      setSavedFilters(JSON.parse(saved));
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleArrayFilterChange = (key, value, checked) => {
    const currentArray = filters[key] || [];
    const newArray = checked 
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    
    handleFilterChange(key, newArray);
  };

  const applyDateRange = (range) => {
    const today = new Date();
    let startDate = '';
    let endDate = today.toISOString().split('T')[0];

    switch (range) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        startDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(today.setMonth(today.getMonth() - 1)).toISOString().split('T')[0];
        break;
      case 'quarter':
        startDate = new Date(today.setMonth(today.getMonth() - 3)).toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(today.setFullYear(today.getFullYear() - 1)).toISOString().split('T')[0];
        break;
      default:
        return;
    }

    setFilters(prev => ({ ...prev, dateRange: range, startDate, endDate }));
    onFiltersChange({ ...filters, dateRange: range, startDate, endDate });
  };

  const saveCurrentFilters = () => {
    const name = prompt('Nome para este filtro:');
    if (name) {
      const newSavedFilter = {
        id: Date.now(),
        name,
        filters: { ...filters }
      };
      const updated = [...savedFilters, newSavedFilter];
      setSavedFilters(updated);
      localStorage.setItem('savedFilters', JSON.stringify(updated));
    }
  };

  const loadSavedFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
    onFiltersChange(savedFilter.filters);
  };

  const deleteSavedFilter = (id) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('savedFilters', JSON.stringify(updated));
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      dateRange: 'custom',
      startDate: '',
      endDate: '',
      amountMin: '',
      amountMax: '',
      status: [],
      employees: [],
      categories: [],
      products: [],
      paymentStatus: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h4 style={{ margin: 0 }}>🔍 Filtros Avançados</h4>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2em'
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Filtros Rápidos - Sempre Visíveis */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
        gap: '10px',
        marginBottom: '15px'
      }}>
        <button onClick={() => applyDateRange('today')} className="btn" style={{ fontSize: '0.8em', padding: '5px' }}>Hoje</button>
        <button onClick={() => applyDateRange('week')} className="btn" style={{ fontSize: '0.8em', padding: '5px' }}>7 dias</button>
        <button onClick={() => applyDateRange('month')} className="btn" style={{ fontSize: '0.8em', padding: '5px' }}>30 dias</button>
        <button onClick={() => applyDateRange('quarter')} className="btn" style={{ fontSize: '0.8em', padding: '5px' }}>3 meses</button>
        <button onClick={() => applyDateRange('year')} className="btn" style={{ fontSize: '0.8em', padding: '5px' }}>1 ano</button>
      </div>

      {isExpanded && (
        <>
          {/* Período Personalizado */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label>Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <label>Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          {/* Filtros de Valor */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label>Valor Mínimo</label>
              <input
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
              />
            </div>
            <div>
              <label>Valor Máximo</label>
              <input
                type="number"
                step="0.01"
                placeholder="R$ 999.999,99"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
              />
            </div>
          </div>

          {/* Status de Pagamento */}
          <div style={{ marginBottom: '20px' }}>
            <label>Status de Pagamento</label>
            <select
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="paid">Pago</option>
              <option value="pending">A Pagar</option>
              <option value="overdue">Vencido</option>
            </select>
          </div>

          {/* Ordenação */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div>
              <label>Ordenar por</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="date">Data</option>
                <option value="amount">Valor</option>
                <option value="category">Categoria</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div>
              <label>Ordem</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              >
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
              </select>
            </div>
          </div>

          {/* Filtros Salvos */}
          {savedFilters.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label>Filtros Salvos</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' }}>
                {savedFilters.map(savedFilter => (
                  <div key={savedFilter.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    backgroundColor: 'var(--cor-fundo)',
                    padding: '5px 10px',
                    borderRadius: '15px',
                    fontSize: '0.9em'
                  }}>
                    <button
                      onClick={() => loadSavedFilter(savedFilter)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        marginRight: '5px'
                      }}
                    >
                      {savedFilter.name}
                    </button>
                    <button
                      onClick={() => deleteSavedFilter(savedFilter.id)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer',
                        color: 'var(--cor-erro)',
                        fontSize: '0.8em'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            justifyContent: 'flex-end',
            borderTop: '1px solid var(--cor-borda)',
            paddingTop: '15px'
          }}>
            <button
              onClick={saveCurrentFilters}
              className="btn"
              style={{ backgroundColor: '#17a2b8', width: 'auto', fontSize: '0.9em' }}
            >
              💾 Salvar Filtro
            </button>
            <button
              onClick={clearAllFilters}
              className="btn"
              style={{ backgroundColor: '#6c757d', width: 'auto', fontSize: '0.9em' }}
            >
              🗑️ Limpar Tudo
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedFilters;