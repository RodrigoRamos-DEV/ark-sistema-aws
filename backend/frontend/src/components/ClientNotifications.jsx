import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Icons } from './Icons';
import API_URL from '../apiConfig';
import { notificationService } from '../feiraService';

const ClientNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifications, setDismissedNotifications] = useState([]);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchNotifications();
    loadDismissedNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const notifications = await notificationService.getClientNotifications();
      setNotifications(notifications);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  const loadDismissedNotifications = () => {
    const userId = user.id || 'guest';
    const dismissed = JSON.parse(localStorage.getItem(`dismissedNotifications_${userId}`) || '[]');
    setDismissedNotifications(dismissed);
  };

  const dismissNotification = async (notificationId) => {
    try {
      await notificationService.dismissNotification(notificationId);
      const newDismissed = [...dismissedNotifications, notificationId];
      setDismissedNotifications(newDismissed);
      
      // Manter localStorage como backup
      const userId = user.id || 'guest';
      localStorage.setItem(`dismissedNotifications_${userId}`, JSON.stringify(newDismissed));
    } catch (error) {
      console.error('Erro ao dispensar notificação:', error);
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

  // Filtrar notificações não dispensadas e relevantes para o tipo de cliente
  const visibleNotifications = notifications.filter(notification => {
    if (dismissedNotifications.includes(notification.id)) return false;
    if (notification.target_audience === 'all') return true;
    
    const userType = user.clientType || user.client_type || user.userType || 'empresa';
    return notification.target_audience === userType;
  });

  if (visibleNotifications.length === 0) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      {visibleNotifications.map(notification => (
        <div
          key={notification.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            marginBottom: '12px',
            border: `1px solid ${getTypeColor(notification.type)}`,
            borderRadius: '8px',
            backgroundColor: `${getTypeColor(notification.type)}15`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ 
            color: getTypeColor(notification.type),
            marginTop: '2px',
            flexShrink: 0
          }}>
            {getTypeIcon(notification.type)}
          </div>
          
          <div style={{ flex: 1 }}>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              color: getTypeColor(notification.type),
              fontSize: '16px'
            }}>
              {notification.title}
            </h4>
            <p style={{ 
              margin: '0 0 8px 0', 
              color: 'var(--cor-texto)',
              lineHeight: '1.5'
            }}>
              {notification.message}
            </p>
            <small style={{ color: 'var(--cor-texto-secundario)' }}>
              {new Date(notification.created_at).toLocaleDateString('pt-BR')}
            </small>
          </div>
          
          <button
            onClick={() => dismissNotification(notification.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--cor-texto-secundario)',
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--cor-texto)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--cor-texto-secundario)'}
            title="Dispensar aviso"
          >
            <Icons.Cancel />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ClientNotifications;