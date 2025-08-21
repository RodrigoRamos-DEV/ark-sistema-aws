import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Icons } from './Icons';
import API_URL from '../apiConfig';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info', // info, warning, success, error
    targetAudience: 'all' // all, empresa, produtor
  });
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/notifications`, {
        headers: { 'x-auth-token': token }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      // Fallback para localStorage
      const stored = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
      setNotifications(stored);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNotification.title || !newNotification.message) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/admin/notifications`, {
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        target_audience: newNotification.targetAudience
      }, {
        headers: { 'x-auth-token': token }
      });
      
      toast.success('Aviso enviado com sucesso!');
      setNewNotification({ title: '', message: '', type: 'info', targetAudience: 'all' });
      fetchNotifications();
    } catch (error) {
      console.error('Erro ao enviar aviso:', error);
      toast.error('Erro ao enviar aviso. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/admin/notifications/${id}`, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Aviso removido');
      fetchNotifications();
    } catch (error) {
      console.error('Erro ao remover aviso:', error);
      toast.error('Erro ao remover aviso.');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return <Icons.AlertCircle />;
      case 'success': return <Icons.Check />;
      case 'error': return <Icons.AlertCircle />;
      default: return <Icons.Info />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'warning': return '#f59e0b';
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  return (
    <div>
      <div className="card">
        <h3>Criar Novo Aviso</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label>Título do Aviso *</label>
              <input
                type="text"
                value={newNotification.title}
                onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                placeholder="Ex: Manutenção programada"
                required
              />
            </div>
            <div>
              <label>Tipo</label>
              <select
                value={newNotification.type}
                onChange={(e) => setNewNotification({...newNotification, type: e.target.value})}
              >
                <option value="info">Informação</option>
                <option value="warning">Aviso</option>
                <option value="success">Sucesso</option>
                <option value="error">Erro/Urgente</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Público Alvo</label>
            <select
              value={newNotification.targetAudience}
              onChange={(e) => setNewNotification({...newNotification, targetAudience: e.target.value})}
            >
              <option value="all">Todos os Clientes</option>
              <option value="empresa">Apenas Empresas</option>
              <option value="produtor">Apenas Produtores</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label>Mensagem *</label>
            <textarea
              value={newNotification.message}
              onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
              placeholder="Digite a mensagem do aviso..."
              rows="4"
              style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda)', borderRadius: '6px', resize: 'vertical' }}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn" 
            disabled={loading}
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Icons.Plus /> {loading ? 'Enviando...' : 'Enviar Aviso'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Avisos Ativos ({notifications.length})</h3>
        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--cor-texto-secundario)', padding: '20px' }}>
            Nenhum aviso ativo
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '15px',
                  border: `1px solid ${getTypeColor(notification.type)}`,
                  borderRadius: '8px',
                  backgroundColor: `${getTypeColor(notification.type)}10`
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ color: getTypeColor(notification.type) }}>
                      {getTypeIcon(notification.type)}
                    </span>
                    <strong>{notification.title}</strong>
                    <span style={{ 
                      fontSize: '12px', 
                      padding: '2px 8px', 
                      borderRadius: '12px', 
                      backgroundColor: getTypeColor(notification.type),
                      color: 'white'
                    }}>
                      {notification.target_audience === 'all' ? 'Todos' : 
                       notification.target_audience === 'empresa' ? 'Empresas' : 'Produtores'}
                    </span>
                  </div>
                  <p style={{ margin: '5px 0', color: 'var(--cor-texto)' }}>
                    {notification.message}
                  </p>
                  <small style={{ color: 'var(--cor-texto-secundario)' }}>
                    Criado em: {new Date(notification.created_at).toLocaleString('pt-BR')}
                  </small>
                </div>
                <button
                  onClick={() => deleteNotification(notification.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--cor-erro)',
                    padding: '4px'
                  }}
                  title="Remover aviso"
                >
                  <Icons.Delete />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;