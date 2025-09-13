import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_URL from '../apiConfig';
import { showToast } from './Toast';

const PlanosPage = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const fetchCurrentPlan = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/subscription/current`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data);
      }
    } catch (error) {
      console.error('Erro ao buscar plano:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/subscription/create-checkout`, {
        method: 'POST',
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: 'premium' })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        window.open(data.checkoutUrl, '_blank');
      } else {
        if (data.error === 'CPF obrigatório' || data.error === 'CPF inválido') {
          showToast(data.message, 'warning', 5000);
          setTimeout(() => {
            showToast('Redirecionando para o perfil...', 'info');
            navigate('/profile');
          }, 2000);
        } else {
          showToast(data.message || 'Erro ao criar checkout', 'error');
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      showToast('Erro ao processar pagamento', 'error');
    } finally {
      setUpgrading(false);
    }
  };





  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div className="planos-container">
      <h1>Escolha seu Plano</h1>
      

      
      {currentPlan && (
        <div className="current-plan-info">
          <h3>Plano Atual: {currentPlan.plan === 'free' ? 'Gratuito' : 'Premium'}</h3>
          {currentPlan.status === 'trial' && (
            <p className="trial-info">
              🎉 Período de teste: {currentPlan.days_left} dias restantes
            </p>
          )}
          {currentPlan.status === 'expired_trial' && (
            <p className="expired-info">
              ⚠️ Seu período de teste expirou. Agora você tem acesso apenas à Feira.
            </p>
          )}
          {currentPlan.plan === 'premium' && currentPlan.expires_at && (
            <p className="premium-info">
              💎 Plano Premium ativo até: {new Date(currentPlan.expires_at).toLocaleDateString('pt-BR')}
            </p>
          )}
          {currentPlan.plan === 'premium' && currentPlan.days_left && (
            <p className={currentPlan.days_left <= 7 ? 'warning-info' : 'premium-info'}>
              {currentPlan.days_left <= 7 ? '⚠️' : '📅'} {currentPlan.days_left} dias restantes
            </p>
          )}
        </div>
      )}



      <div className="plans-grid">
        <div className="plan-card free">
          <h3>Gratuito</h3>
          <div className="price">R$ 0</div>
          <div className="features">
            <p>✅ 3 dias de teste completo</p>
            <p>✅ Acesso à Feira (após teste)</p>
            <p>❌ Lançamentos</p>
            <p>❌ Relatórios</p>
            <p>❌ Cupons</p>
          </div>
          <button 
            className="plan-button current" 
            disabled={currentPlan?.plan === 'free'}
          >
            {currentPlan?.plan === 'free' ? 'Plano Atual' : 'Gratuito'}
          </button>
        </div>

        <div className="plan-card premium">
          <h3>Premium</h3>
          <div className="price">
            R$ 39,90<span>/mês</span>
          </div>
          <div className="features">
            <p>✅ Acesso completo</p>
            <p>✅ Feira</p>
            <p>✅ Lançamentos</p>
            <p>✅ Relatórios</p>
            <p>✅ Cupons</p>
            <p>✅ Suporte prioritário</p>
          </div>
          <button 
            className="plan-button upgrade"
            onClick={handleUpgrade}
            disabled={currentPlan?.plan === 'premium' || upgrading}
          >
            {upgrading ? 'Processando...' : 
             currentPlan?.plan === 'premium' ? 'Plano Atual' : 'Assinar Premium'}
          </button>
        </div>
      </div>

      <style>{`
        .planos-container {
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .current-plan-info {
          background: var(--cor-fundo);
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 30px;
          border-left: 4px solid var(--cor-primaria);
          border: 1px solid var(--cor-borda);
        }

        .trial-info {
          color: var(--cor-sucesso);
          font-weight: bold;
        }

        .expired-info {
          color: var(--cor-erro);
          font-weight: bold;
        }

        .premium-info {
          color: var(--cor-primaria);
          font-weight: bold;
        }

        .warning-info {
          color: var(--cor-aviso);
          font-weight: bold;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 30px;
          margin-top: 30px;
        }

        .plan-card {
          border: 2px solid var(--cor-borda);
          border-radius: 12px;
          padding: 30px;
          text-align: center;
          background: var(--cor-card);
          box-shadow: var(--sombra-card);
          transition: transform 0.2s;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .plan-card:hover {
          transform: translateY(-5px);
        }

        .plan-card.premium {
          border-color: var(--cor-primaria);
          position: relative;
        }

        .plan-card.premium::before {
          content: "RECOMENDADO";
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--cor-primaria);
          color: white;
          padding: 5px 15px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: bold;
        }

        .price {
          font-size: 2.5em;
          font-weight: bold;
          color: var(--cor-primaria);
          margin: 20px 0;
        }

        .price span {
          font-size: 0.4em;
          color: var(--cor-texto-label);
        }

        .features {
          text-align: left;
          margin: 20px 0;
          flex-grow: 1;
        }

        .features p {
          margin: 10px 0;
          padding: 5px 0;
          color: var(--cor-texto);
        }

        .plan-button {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
          min-height: 44px;
          margin-top: auto;
        }

        .plan-button.current {
          background: #6c757d;
          color: white;
        }

        .plan-button.upgrade {
          background: var(--cor-primaria);
          color: white;
        }

        .plan-button.upgrade:hover {
          background: var(--cor-destaque);
        }

        .plan-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading {
          text-align: center;
          padding: 50px;
          font-size: 18px;
          color: var(--cor-texto);
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .planos-container {
            padding: 15px;
          }

          .plans-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .plan-card {
            padding: 20px;
          }

          .price {
            font-size: 2em;
          }

          .plan-button {
            font-size: 16px;
            padding: 12px;
          }

          .current-plan-info {
            padding: 12px;
            margin-bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default PlanosPage;