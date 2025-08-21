import axios from 'axios';
import API_URL from '../apiConfig';

class BackupService {
  constructor() {
    this.isBackupRunning = false;
    this.lastBackup = localStorage.getItem('lastBackup');
    this.startAutoBackup();
  }

  async createBackup() {
    if (this.isBackupRunning) return;
    
    this.isBackupRunning = true;
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.post(`${API_URL}/api/backup/create`, {}, {
        headers: { 'x-auth-token': token }
      });
      
      localStorage.setItem('lastBackup', new Date().toISOString());
      console.log('Backup criado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      throw error;
    } finally {
      this.isBackupRunning = false;
    }
  }

  async downloadBackup() {
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.get(`${API_URL}/api/backup/download`, {
        headers: { 'x-auth-token': token },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar backup:', error);
      throw error;
    }
  }

  startAutoBackup() {
    // Backup automático a cada 24 horas
    setInterval(() => {
      const lastBackup = localStorage.getItem('lastBackup');
      const now = new Date();
      const lastBackupDate = lastBackup ? new Date(lastBackup) : new Date(0);
      
      // Se passou mais de 24 horas desde o último backup
      if (now - lastBackupDate > 24 * 60 * 60 * 1000) {
        this.createBackup().catch(console.error);
      }
    }, 60 * 60 * 1000); // Verificar a cada hora
  }

  shouldShowBackupReminder() {
    const lastBackup = localStorage.getItem('lastBackup');
    if (!lastBackup) return true;
    
    const lastBackupDate = new Date(lastBackup);
    const now = new Date();
    
    // Mostrar lembrete se passou mais de 7 dias
    return (now - lastBackupDate) > 7 * 24 * 60 * 60 * 1000;
  }
}

export default new BackupService();