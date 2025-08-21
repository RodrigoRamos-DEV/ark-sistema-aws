import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../apiConfig';

const AVAILABLE_WIDGETS = {
  sales_summary: { title: 'Resumo de Vendas', component: 'SalesSummary', size: 'medium' },
  recent_transactions: { title: 'Transações Recentes', component: 'RecentTransactions', size: 'large' },
  top_products: { title: 'Produtos Mais Vendidos', component: 'TopProducts', size: 'medium' },
  monthly_chart: { title: 'Gráfico Mensal', component: 'MonthlyChart', size: 'large' },
  quick_stats: { title: 'Estatísticas Rápidas', component: 'QuickStats', size: 'small' },
  alerts: { title: 'Alertas', component: 'Alerts', size: 'medium' }
};

const CustomizableDashboard = () => {
  const [widgets, setWidgets] = useState([]);
  const [availableWidgets, setAvailableWidgets] = useState([]);
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    loadDashboardConfig();
  }, []);

  const loadDashboardConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/dashboard/config`, {
        headers: { 'x-auth-token': token }
      });
      
      setWidgets(response.data.widgets || Object.keys(AVAILABLE_WIDGETS));
      setAvailableWidgets(Object.keys(AVAILABLE_WIDGETS).filter(
        w => !response.data.widgets?.includes(w)
      ));
    } catch (error) {
      // Se não há configuração, usar padrão
      setWidgets(Object.keys(AVAILABLE_WIDGETS));
      setAvailableWidgets([]);
    }
  };

  const saveDashboardConfig = async (newWidgets) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/dashboard/config`, {
        widgets: newWidgets
      }, {
        headers: { 'x-auth-token': token }
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
    }
  };

  const moveWidget = (fromIndex, toIndex) => {
    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, reorderedItem);
    setWidgets(items);
    saveDashboardConfig(items);
  };

  const addWidget = (widgetId) => {
    const newWidgets = [...widgets, widgetId];
    setWidgets(newWidgets);
    setAvailableWidgets(availableWidgets.filter(w => w !== widgetId));
    saveDashboardConfig(newWidgets);
  };

  const removeWidget = (widgetId) => {
    const newWidgets = widgets.filter(w => w !== widgetId);
    setWidgets(newWidgets);
    setAvailableWidgets([...availableWidgets, widgetId]);
    saveDashboardConfig(newWidgets);
  };

  const renderWidget = (widgetId, index) => {
    const widget = AVAILABLE_WIDGETS[widgetId];
    if (!widget) return null;

    return (
      <div key={widgetId} className="card" style={{ marginBottom: '20px', position: 'relative' }}>
        {isCustomizing && (
          <>
            <button
              onClick={() => removeWidget(widgetId)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'var(--cor-erro)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '25px',
                height: '25px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ×
            </button>
            <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '5px' }}>
              {index > 0 && (
                <button onClick={() => moveWidget(index, index - 1)} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', padding: '2px 6px' }}>↑</button>
              )}
              {index < widgets.length - 1 && (
                <button onClick={() => moveWidget(index, index + 1)} style={{ background: '#007bff', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', padding: '2px 6px' }}>↓</button>
              )}
            </div>
          </>
        )}
        
        <h3 style={{ margin: '0 0 15px 0', color: 'var(--cor-primaria)' }}>
          {widget.title}
        </h3>
        
        <div style={{ 
          padding: '20px', 
          backgroundColor: 'var(--cor-fundo)', 
          borderRadius: '8px',
          textAlign: 'center',
          color: 'var(--cor-texto-label)'
        }}>
          Widget: {widget.component}
          <br />
          <small>Tamanho: {widget.size}</small>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h2 style={{ color: 'var(--cor-primaria)' }}>📊 Dashboard</h2>
        <button
          onClick={() => setIsCustomizing(!isCustomizing)}
          className="btn"
          style={{ 
            backgroundColor: isCustomizing ? '#dc3545' : '#17a2b8',
            width: 'auto'
          }}
        >
          {isCustomizing ? '✓ Finalizar' : '⚙️ Personalizar'}
        </button>
      </div>

      {isCustomizing && availableWidgets.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h4>Widgets Disponíveis</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {availableWidgets.map(widgetId => (
              <button
                key={widgetId}
                onClick={() => addWidget(widgetId)}
                className="btn"
                style={{ 
                  backgroundColor: '#28a745',
                  width: 'auto',
                  fontSize: '0.9em'
                }}
              >
                + {AVAILABLE_WIDGETS[widgetId].title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        {widgets.map((widgetId, index) => renderWidget(widgetId, index))}
      </div>

      {isCustomizing && (
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px', 
          backgroundColor: 'var(--cor-primaria)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '0.9em'
        }}>
          💡 Use ↑↓ para reordenar widgets
        </div>
      )}
    </div>
  );
};

export default CustomizableDashboard;