const db = require('../config/db');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async checkAndSendNotifications() {
    try {
      console.log('🔔 Verificando notificações pendentes...');
      
      // Buscar atividades que precisam de notificação
      const atividades = await this.getAtividadesPendentes();
      
      for (const atividade of atividades) {
        await this.sendActivityNotification(atividade);
      }
      
      // Buscar alertas climáticos
      const alertasClimaticos = await this.getAlertasClimaticos();
      
      for (const alerta of alertasClimaticos) {
        await this.sendWeatherAlert(alerta);
      }
      
      console.log(`✅ ${atividades.length + alertasClimaticos.length} notificações processadas`);
    } catch (error) {
      console.error('❌ Erro ao processar notificações:', error);
    }
  }

  async getAtividadesPendentes() {
    const query = `
      SELECT a.*, p.safra, c.nome as cultura_nome, ar.nome as area_nome,
             cl.company_name, cl.email, cl.contact_phone
      FROM atividades_calendario a
      JOIN planejamentos_safra p ON a.planejamento_id = p.id
      JOIN culturas c ON p.cultura_id = c.id
      JOIN areas_producao ar ON p.area_id = ar.id
      JOIN clients cl ON a.client_id = cl.id
      WHERE a.status = 'pendente' 
      AND a.data_prevista BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
      AND (a.notificado IS NULL OR a.notificado = false)
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  async getAlertasClimaticos() {
    const query = `
      SELECT ap.*, cl.company_name, cl.email, cl.contact_phone
      FROM alertas_producao ap
      JOIN clients cl ON ap.client_id = cl.id
      WHERE ap.ativo = true 
      AND ap.data_alerta = CURRENT_DATE
      AND (ap.notificado IS NULL OR ap.notificado = false)
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  async sendActivityNotification(atividade) {
    try {
      const diasRestantes = this.calculateDaysUntil(atividade.data_prevista);
      const urgencyLevel = this.getUrgencyLevel(diasRestantes, atividade.prioridade);
      
      // Criar notificação no banco
      await this.createNotification({
        client_id: atividade.client_id,
        type: 'atividade',
        title: `${this.getActivityIcon(atividade.tipo)} ${atividade.titulo}`,
        message: `${atividade.cultura_nome} - ${atividade.area_nome}`,
        urgency: urgencyLevel,
        data: {
          atividade_id: atividade.id,
          data_prevista: atividade.data_prevista,
          dias_restantes: diasRestantes
        }
      });

      // Enviar email se configurado
      if (atividade.email && this.shouldSendEmail(urgencyLevel)) {
        await this.sendEmail({
          to: atividade.email,
          subject: `🌱 Atividade Agrícola: ${atividade.titulo}`,
          html: this.generateActivityEmailTemplate(atividade, diasRestantes)
        });
      }

      // Marcar como notificado
      await db.query(
        'UPDATE atividades_calendario SET notificado = true WHERE id = $1',
        [atividade.id]
      );

      console.log(`📧 Notificação enviada: ${atividade.titulo}`);
    } catch (error) {
      console.error('Erro ao enviar notificação de atividade:', error);
    }
  }

  async sendWeatherAlert(alerta) {
    try {
      // Criar notificação no banco
      await this.createNotification({
        client_id: alerta.client_id,
        type: 'clima',
        title: alerta.titulo,
        message: alerta.mensagem,
        urgency: alerta.prioridade,
        data: {
          alerta_id: alerta.id,
          tipo: alerta.tipo
        }
      });

      // Enviar email para alertas importantes
      if (alerta.email && alerta.prioridade === 'alta') {
        await this.sendEmail({
          to: alerta.email,
          subject: `🌦️ Alerta Climático: ${alerta.titulo}`,
          html: this.generateWeatherEmailTemplate(alerta)
        });
      }

      // Marcar como notificado
      await db.query(
        'UPDATE alertas_producao SET notificado = true WHERE id = $1',
        [alerta.id]
      );

      console.log(`🌦️ Alerta climático enviado: ${alerta.titulo}`);
    } catch (error) {
      console.error('Erro ao enviar alerta climático:', error);
    }
  }

  async createNotification(notification) {
    const query = `
      INSERT INTO notifications (client_id, type, title, message, urgency, data, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `;
    
    const result = await db.query(query, [
      notification.client_id,
      notification.type,
      notification.title,
      notification.message,
      notification.urgency,
      JSON.stringify(notification.data)
    ]);
    
    return result.rows[0].id;
  }

  async sendEmail(emailData) {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      });
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  }

  calculateDaysUntil(dateString) {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getUrgencyLevel(days, priority) {
    if (days <= 0) return 'urgent';
    if (days === 1 && priority === 'alta') return 'high';
    if (days <= 2) return 'medium';
    return 'low';
  }

  shouldSendEmail(urgency) {
    return ['urgent', 'high'].includes(urgency);
  }

  getActivityIcon(tipo) {
    const icons = {
      'plantio': '🌱',
      'preparo_solo': '🚜',
      'adubacao': '🌿',
      'pulverizacao': '💧',
      'irrigacao': '💦',
      'colheita': '🌾',
      'monitoramento': '👁️'
    };
    return icons[tipo] || '📋';
  }

  generateActivityEmailTemplate(atividade, diasRestantes) {
    const urgencyColor = diasRestantes <= 1 ? '#dc3545' : '#ffc107';
    const urgencyText = diasRestantes <= 0 ? 'HOJE!' : 
                       diasRestantes === 1 ? 'AMANHÃ' : 
                       `${diasRestantes} DIAS`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Atividade Agrícola</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🌱 ${atividade.company_name}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Calendário de Produção</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="background-color: ${urgencyColor}; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 18px;">${this.getActivityIcon(atividade.tipo)} ${atividade.titulo}</h2>
              <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold;">${urgencyText}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Detalhes da Atividade</h3>
              <p style="margin: 5px 0;"><strong>Cultura:</strong> ${atividade.cultura_nome}</p>
              <p style="margin: 5px 0;"><strong>Área:</strong> ${atividade.area_nome}</p>
              <p style="margin: 5px 0;"><strong>Safra:</strong> ${atividade.safra}</p>
              <p style="margin: 5px 0;"><strong>Data Prevista:</strong> ${new Date(atividade.data_prevista).toLocaleDateString('pt-BR')}</p>
              <p style="margin: 5px 0;"><strong>Prioridade:</strong> ${atividade.prioridade}</p>
            </div>
            
            ${atividade.descricao ? `
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #0066cc;">Observações</h4>
              <p style="margin: 0; color: #333;">${atividade.descricao}</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">
                Esta é uma notificação automática do seu Calendário de Produção ARK
              </p>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              © ${new Date().getFullYear()} Sistema ARK - Gestão Agrícola Inteligente
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateWeatherEmailTemplate(alerta) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Alerta Climático</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🌦️ ${alerta.company_name}</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Alerta Climático</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="margin: 0 0 10px 0; color: #856404;">${alerta.titulo}</h2>
              <p style="margin: 0; color: #856404; font-size: 16px;">${alerta.mensagem}</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #666; font-size: 14px;">
                Monitore suas culturas e tome as precauções necessárias
              </p>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              © ${new Date().getFullYear()} Sistema ARK - Gestão Agrícola Inteligente
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Método para executar verificações periódicas
  startPeriodicCheck() {
    // Verificar a cada 6 horas
    setInterval(() => {
      this.checkAndSendNotifications();
    }, 6 * 60 * 60 * 1000);

    // Executar imediatamente
    this.checkAndSendNotifications();
  }
}

module.exports = new NotificationService();