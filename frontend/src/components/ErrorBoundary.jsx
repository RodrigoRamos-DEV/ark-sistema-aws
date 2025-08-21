import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log do erro para monitoramento
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'var(--cor-card)',
          borderRadius: '12px',
          margin: '20px',
          border: '2px solid var(--cor-erro)'
        }}>
          <h2 style={{ color: 'var(--cor-erro)', marginBottom: '20px' }}>
            🚨 Oops! Algo deu errado
          </h2>
          <p style={{ color: 'var(--cor-texto)', marginBottom: '20px' }}>
            Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.
          </p>
          
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => window.location.reload()} 
              className="btn"
              style={{ marginRight: '10px' }}
            >
              🔄 Recarregar Página
            </button>
            <button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} 
              className="btn"
              style={{ backgroundColor: '#6c757d' }}
            >
              ↩️ Tentar Novamente
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details style={{ 
              textAlign: 'left', 
              backgroundColor: '#f8f9fa', 
              padding: '15px', 
              borderRadius: '5px',
              marginTop: '20px'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Detalhes do Erro (Desenvolvimento)
              </summary>
              <pre style={{ 
                fontSize: '12px', 
                overflow: 'auto', 
                marginTop: '10px',
                color: '#dc3545'
              }}>
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;