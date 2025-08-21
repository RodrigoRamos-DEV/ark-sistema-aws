import axios from 'axios';
import API_URL from '../apiConfig';

class AuditLogger {
  async log(action, entity, entityId, oldData = null, newData = null) {
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(`${API_URL}/api/audit/log`, {
        action,
        entity,
        entityId,
        oldData,
        newData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: await this.getClientIP()
      }, {
        headers: { 'x-auth-token': token }
      });
    } catch (error) {
      console.error('Erro ao registrar audit log:', error);
    }
  }

  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  }

  // Métodos de conveniência
  logCreate(entity, entityId, data) {
    return this.log('CREATE', entity, entityId, null, data);
  }

  logUpdate(entity, entityId, oldData, newData) {
    return this.log('UPDATE', entity, entityId, oldData, newData);
  }

  logDelete(entity, entityId, data) {
    return this.log('DELETE', entity, entityId, data, null);
  }

  logLogin() {
    return this.log('LOGIN', 'user', 'current', null, null);
  }

  logLogout() {
    return this.log('LOGOUT', 'user', 'current', null, null);
  }
}

export default new AuditLogger();