import React from 'react';

const TrialStatus = ({ user }) => {
  if (!user || !user.licenseStatus || (user.licenseStatus !== 'Trial' && user.licenseStatus !== 'Trial Expirado')) {
    return null;
  }

  const isExpired = user.licenseStatus === 'Trial Expirado';
  const daysLeft = user.daysLeft || 0;
  const whatsappNumber = "+55 21 97304-4415"; // SUBSTITUA PELO SEU NÚMERO REAL

  const handleWhatsAppClick = () => {
    const companyName = user.companyName || 'Não informado';
    const message = encodeURIComponent(
      `Olá! Gostaria de renovar minha licença do Sistema ARK. Empresa: ${companyName}`
    );
    window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  if (isExpired) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px',
        margin: '20px',
        textAlign: 'center',
        boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>⏰ Trial Expirado</h3>
        <p style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
          Seu período de teste gratuito terminou. Para continuar usando o sistema, entre em contato conosco!
        </p>
        <button
          onClick={handleWhatsAppClick}
          style={{
            background: '#25D366',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#128C7E';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#25D366';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
          Renovar via WhatsApp
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: daysLeft <= 1 ? 'linear-gradient(135deg, #ffa726, #ff9800)' : 'linear-gradient(135deg, #4CAF50, #45a049)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '12px',
      margin: '20px',
      textAlign: 'center',
      boxShadow: daysLeft <= 1 ? '0 4px 15px rgba(255, 167, 38, 0.3)' : '0 4px 15px rgba(76, 175, 80, 0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '24px' }}>
          {daysLeft <= 1 ? '⚠️' : '🎉'}
        </span>
        <h3 style={{ margin: '0', fontSize: '18px' }}>
          {daysLeft <= 1 ? 'Trial Expirando!' : 'Trial Ativo'}
        </h3>
      </div>
      
      <p style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
        {daysLeft > 0 ? `${daysLeft} dia${daysLeft > 1 ? 's' : ''} restante${daysLeft > 1 ? 's' : ''}` : 'Último dia!'}
      </p>
      
      {daysLeft <= 1 && (
        <button
          onClick={handleWhatsAppClick}
          style={{
            background: '#25D366',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#128C7E';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#25D366';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
          Renovar Agora
        </button>
      )}
    </div>
  );
};

export default TrialStatus;