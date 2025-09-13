import React, { useState, useEffect } from 'react';

const ResponsiveTable = ({ 
  data = [], 
  columns = [], 
  actions = null,
  emptyMessage = "Nenhum dado encontrado",
  className = ""
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (data.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--cor-texto-label)' }}>{emptyMessage}</p>
      </div>
    );
  }

  if (isMobile) {
    // Renderização em cards para mobile
    return (
      <div className={`mobile-card-table ${className}`}>
        {data.map((item, index) => (
          <div key={index} className="card" style={{ marginBottom: '15px', padding: '15px' }}>
            {columns.map((column) => (
              <div key={column.key} className="card-row" style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--cor-borda)'
              }}>
                <span className="card-label" style={{
                  fontWeight: 'bold',
                  color: 'var(--cor-texto-label)',
                  fontSize: '14px'
                }}>
                  {column.label}:
                </span>
                <span style={{ 
                  textAlign: 'right',
                  fontSize: '14px',
                  color: 'var(--cor-texto)'
                }}>
                  {column.render ? column.render(item) : item[column.key]}
                </span>
              </div>
            ))}
            {actions && (
              <div style={{ 
                marginTop: '15px', 
                paddingTop: '15px', 
                borderTop: '1px solid var(--cor-borda)',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                {actions(item).map((action, actionIndex) => (
                  <button
                    key={actionIndex}
                    onClick={action.onClick}
                    className="btn"
                    style={{
                      backgroundColor: action.color || 'var(--cor-primaria)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      flex: '1',
                      minWidth: '80px'
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Renderização em tabela para desktop
  return (
    <div className={`table-responsive ${className}`}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'var(--cor-card)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: 'var(--sombra-card)'
      }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--cor-primaria)', color: 'white' }}>
            {columns.map((column) => (
              <th key={column.key} style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {column.label}
              </th>
            ))}
            {actions && (
              <th style={{
                padding: '12px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} style={{
              borderBottom: '1px solid var(--cor-borda)',
              transition: 'background-color 0.2s'
            }}>
              {columns.map((column) => (
                <td key={column.key} style={{
                  padding: '12px',
                  fontSize: '14px',
                  color: 'var(--cor-texto)'
                }}>
                  {column.render ? column.render(item) : item[column.key]}
                </td>
              ))}
              {actions && (
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                    {actions(item).map((action, actionIndex) => (
                      <button
                        key={actionIndex}
                        onClick={action.onClick}
                        className="btn"
                        style={{
                          backgroundColor: action.color || 'var(--cor-primaria)',
                          color: 'white',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResponsiveTable;