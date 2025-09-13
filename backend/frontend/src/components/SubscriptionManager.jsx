import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';

const SubscriptionManager = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSubscription, setEditingSubscription] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/subscription/admin/subscriptions`, {
        headers: { 'x-auth-token': token }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      toast.error('Erro ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleUpdateSubscription = async (userId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/subscription/admin/subscriptions/${userId}`, {
        method: 'PUT',
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        toast.success('Assinatura atualizada com sucesso!');
        fetchSubscriptions();
        setEditingSubscription(null);
      } else {
        toast.error('Erro ao atualizar assinatura');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar assinatura');
    }
  };

  const getStatusColor = (status, plan) => {
    if (plan === 'premium' && status === 'active') return '#16a34a';
    if (status === 'expired') return '#dc2626';
    if (status === 'trial') return '#f59e0b';
    return '#6b7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) return <div>Carregando assinaturas...</div>;

  return (
    <div className="card">
      <h3>Gerenciar Assinaturas</h3>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--cor-primaria)' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Cliente</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Plano</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Trial Expira</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Expira Em</th>
              <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map(sub => (
              <tr key={sub.user_id} style={{ borderBottom: '1px solid var(--cor-borda)' }}>
                <td style={{ padding: '10px' }}>{sub.company_name || 'N/A'}</td>
                <td style={{ padding: '10px' }}>{sub.email}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.8em',
                    fontWeight: 'bold',
                    backgroundColor: sub.plan === 'premium' ? '#16a34a' : '#6b7280',
                    color: 'white'
                  }}>
                    {sub.plan === 'premium' ? 'PREMIUM' : 'FREE'}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.8em',
                    fontWeight: 'bold',
                    backgroundColor: getStatusColor(sub.status, sub.plan),
                    color: 'white'
                  }}>
                    {sub.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '10px' }}>{formatDate(sub.trial_ends_at)}</td>
                <td style={{ padding: '10px' }}>{formatDate(sub.expires_at)}</td>
                <td style={{ padding: '10px', textAlign: 'center' }}>
                  <button
                    onClick={() => setEditingSubscription(sub)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2em',
                      marginRight: '10px'
                    }}
                    title="Editar Assinatura"
                  >
                    ✏️
                  </button>
                  
                  {sub.plan === 'free' && (
                    <button
                      onClick={() => handleUpdateSubscription(sub.user_id, {
                        plan: 'premium',
                        status: 'active',
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                      })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.2em',
                        marginRight: '10px'
                      }}
                      title="Ativar Premium"
                    >
                      ⬆️
                    </button>
                  )}
                  
                  {sub.status === 'expired' && (
                    <button
                      onClick={() => handleUpdateSubscription(sub.user_id, {
                        plan: 'premium',
                        status: 'active',
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                      })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.2em'
                      }}
                      title="Renovar por 30 dias"
                    >
                      🔄
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingSubscription && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 1001,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="card" style={{ width: '90%', maxWidth: '500px' }}>
            <h3>Editar Assinatura - {editingSubscription.company_name || editingSubscription.email}</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label>Plano:</label>
              <select
                value={editingSubscription.plan}
                onChange={(e) => setEditingSubscription({
                  ...editingSubscription,
                  plan: e.target.value
                })}
                style={{ marginTop: '5px' }}
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Status:</label>
              <select
                value={editingSubscription.status}
                onChange={(e) => setEditingSubscription({
                  ...editingSubscription,
                  status: e.target.value
                })}
                style={{ marginTop: '5px' }}
              >
                <option value="active">Ativo</option>
                <option value="expired">Expirado</option>
                <option value="trial">Trial</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label>Data de Expiração:</label>
              <input
                type="date"
                value={editingSubscription.expires_at ? editingSubscription.expires_at.split('T')[0] : ''}
                onChange={(e) => setEditingSubscription({
                  ...editingSubscription,
                  expires_at: e.target.value ? new Date(e.target.value).toISOString() : null
                })}
                style={{ marginTop: '5px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="btn"
                onClick={() => handleUpdateSubscription(editingSubscription.user_id, {
                  plan: editingSubscription.plan,
                  status: editingSubscription.status,
                  expires_at: editingSubscription.expires_at
                })}
                style={{ backgroundColor: '#16a34a' }}
              >
                Salvar
              </button>
              <button
                className="btn"
                onClick={() => setEditingSubscription(null)}
                style={{ backgroundColor: '#6b7280' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;