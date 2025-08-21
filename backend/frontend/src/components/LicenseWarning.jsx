import React, { useState, useEffect } from 'react';

const LicenseWarning = () => {
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLicense = () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.licenseExpiresAt) {
          const expiresAt = new Date(user.licenseExpiresAt);
          const now = new Date();
          const diffTime = expiresAt - now;
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let status = 'active';
          if (daysRemaining <= 0) {
            status = 'expired';
          } else if (daysRemaining <= 5) {
            status = 'expiring';
          }
          
          setLicenseInfo({
            status,
            daysRemaining,
            expiresAt: user.licenseExpiresAt
          });
        }
      } catch (error) {
        console.error('Erro ao verificar licença:', error);
      } finally {
        setLoading(false);
      }
    };

    checkLicense();
  }, []);

  if (loading || !licenseInfo) return null;

  const { status, daysRemaining, expiresAt } = licenseInfo;

  // Overlay para licença vencida
  if (status === 'expired') {
    return (
      <div className="expiry-overlay">
        <div className="expiry-overlay-content">
          <h2>🚨 Licença Vencida</h2>
          <p>Sua licença venceu em {new Date(expiresAt).toLocaleDateString('pt-BR')}.</p>
          <p>Entre em contato conosco para renovar e continuar usando o sistema.</p>
          <div style={{ marginTop: '20px' }}>
            <button 
              className="btn" 
              onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
              style={{ marginRight: '10px' }}
            >
              📱 WhatsApp
            </button>
            <button 
              className="btn" 
              onClick={() => window.open('mailto:suporte@empresa.com', '_blank')}
              style={{ backgroundColor: '#6c757d' }}
            >
              📧 Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Aviso para licenças próximas do vencimento (5 dias ou menos)
  if (status === 'expiring' && daysRemaining <= 5) {
    return (
      <div className="expiry-warning">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>⚠️</span>
          <div>
            <strong>Licença vencendo!</strong>
            <br />
            <small>
              {daysRemaining === 0 
                ? 'Vence hoje!' 
                : `${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} restante${daysRemaining > 1 ? 's' : ''}`
              }
            </small>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LicenseWarning;