// Configurações do Sistema de Suporte
export const SUPPORT_CONFIG = {
  // Seu número do WhatsApp (formato: código do país + DDD + número)
  // Exemplo: 5511999999999 (Brasil: 55, São Paulo: 11, número: 999999999)
  whatsappNumber: "5521973047049", // Número do suporte
  
  // Mensagens padrão
  defaultMessage: "Olá! Preciso de ajuda com o Sistema ARK.",
  businessName: "Sistema ARK",
  supportName: "Suporte ARK",
  
  // Horário de funcionamento
  businessHours: {
    enabled: true,
    timezone: "America/Sao_Paulo",
    schedule: {
      monday: { start: "08:00", end: "18:00" },
      tuesday: { start: "08:00", end: "18:00" },
      wednesday: { start: "08:00", end: "18:00" },
      thursday: { start: "08:00", end: "18:00" },
      friday: { start: "08:00", end: "18:00" },
      saturday: { start: "08:00", end: "12:00" },
      sunday: null // Fechado
    }
  },
  
  // FAQ personalizada - adicione suas próprias perguntas
  customFaqs: [
    {
      id: 'custom_1',
      question: "Qual o valor da licença do sistema?",
      answer: "Entre em contato conosco para conhecer nossos planos e valores. Temos opções para diferentes tamanhos de empresa.",
      keywords: ["preço", "valor", "licença", "plano", "custo"]
    },
    {
      id: 'custom_2', 
      question: "O sistema tem suporte técnico?",
      answer: "Sim! Oferecemos suporte técnico completo via WhatsApp, email e telefone durante o horário comercial.",
      keywords: ["suporte", "técnico", "ajuda", "atendimento"]
    },
    {
      id: 'custom_3',
      question: "Posso testar o sistema antes de comprar?",
      answer: "Claro! Oferecemos um período de teste gratuito de 15 dias para você conhecer todas as funcionalidades.",
      keywords: ["teste", "trial", "demonstração", "grátis", "avaliar"]
    }
  ],
  
  // Configurações visuais
  theme: {
    primaryColor: "#25D366",
    secondaryColor: "#128C7E",
    buttonPosition: "bottom-right", // bottom-right, bottom-left
    showPulseAnimation: true,
    showFloatAnimation: true
  }
};

// Função para verificar horário de funcionamento
export const isBusinessHours = () => {
  if (!SUPPORT_CONFIG.businessHours.enabled) return true;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = days[now.getDay()];
  const schedule = SUPPORT_CONFIG.businessHours.schedule[day];
  
  if (!schedule) return false;
  
  const currentTime = now.toLocaleTimeString('pt-BR', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return currentTime >= schedule.start && currentTime <= schedule.end;
};

// Função para formatar número do WhatsApp
export const formatWhatsAppNumber = (number) => {
  return number.replace(/\D/g, '');
};