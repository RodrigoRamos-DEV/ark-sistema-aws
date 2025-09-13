const db = require('../config/database');

class ChatbotService {
  constructor() {
    this.knowledgeBase = {
      // Culturas e suas informações
      cultures: {
        'soja': {
          name: 'Soja',
          plantingPeriod: 'Setembro a Dezembro',
          harvest: '120-140 dias',
          soilType: 'Bem drenado, pH 6.0-7.0',
          climate: 'Tropical e subtropical',
          spacing: '45-50cm entre fileiras',
          tips: 'Fazer rotação com milho, controlar pragas como lagarta e percevejos'
        },
        'milho': {
          name: 'Milho',
          plantingPeriod: 'Setembro a Janeiro',
          harvest: '90-120 dias',
          soilType: 'Fértil, bem drenado, pH 5.5-7.0',
          climate: 'Tropical, subtropical e temperado',
          spacing: '70-90cm entre fileiras',
          tips: 'Irrigação adequada no pendoamento, controle de lagarta-do-cartucho'
        },
        'café': {
          name: 'Café',
          plantingPeriod: 'Outubro a Março',
          harvest: '3-4 anos após plantio',
          soilType: 'Bem drenado, rico em matéria orgânica, pH 6.0-6.5',
          climate: 'Tropical de altitude, 18-22°C',
          spacing: '3.5x0.5m ou 4x0.5m',
          tips: 'Sombreamento inicial, poda anual, controle de broca e ferrugem'
        },
        'cana-de-açúcar': {
          name: 'Cana-de-açúcar',
          plantingPeriod: 'Setembro a Março',
          harvest: '12-18 meses',
          soilType: 'Profundo, bem drenado, pH 5.5-7.0',
          climate: 'Tropical e subtropical quente',
          spacing: '1.4-1.5m entre fileiras',
          tips: 'Irrigação no estabelecimento, controle de broca e cigarrinha'
        },
        'algodão': {
          name: 'Algodão',
          plantingPeriod: 'Dezembro a Janeiro',
          harvest: '150-180 dias',
          soilType: 'Bem drenado, pH 5.8-8.0',
          climate: 'Tropical e subtropical',
          spacing: '76-90cm entre fileiras',
          tips: 'Controle rigoroso de pragas, especialmente bicudo e lagarta'
        },
        'feijão': {
          name: 'Feijão',
          plantingPeriod: 'Março a Julho (seca), Outubro a Janeiro (águas)',
          harvest: '80-100 dias',
          soilType: 'Bem drenado, pH 6.0-7.0',
          climate: 'Tropical e subtropical',
          spacing: '30-40cm entre fileiras',
          tips: 'Evitar encharcamento, controle de antracnose e mosaico dourado'
        }
      },

      // Problemas comuns e soluções
      problems: {
        'pragas': {
          'lagarta': 'Use controle biológico com Bt ou inseticidas específicos. Monitore semanalmente.',
          'pulgão': 'Controle com predadores naturais ou inseticidas sistêmicos.',
          'trips': 'Use armadilhas azuis e controle químico se necessário.',
          'bicudo': 'Destruição de restos culturais, uso de feromônios e controle químico.'
        },
        'doenças': {
          'ferrugem': 'Fungicidas preventivos e variedades resistentes.',
          'antracnose': 'Sementes tratadas e rotação de culturas.',
          'mosaico': 'Controle de vetores e uso de variedades resistentes.',
          'murcha': 'Drenagem adequada e fungicidas sistêmicos.'
        },
        'solo': {
          'acidez': 'Calagem 60-90 dias antes do plantio.',
          'compactação': 'Subsolagem e uso de plantas de cobertura.',
          'erosão': 'Plantio em curvas de nível e cobertura vegetal.',
          'salinidade': 'Drenagem e lavagem do solo.'
        }
      },

      // Técnicas agrícolas
      techniques: {
        'irrigação': 'Monitore a umidade do solo, use gotejamento para economia de água.',
        'adubação': 'Faça análise de solo, use adubação balanceada NPK.',
        'plantio direto': 'Mantenha cobertura vegetal, use rotação de culturas.',
        'controle biológico': 'Preserve inimigos naturais, use produtos biológicos.'
      }
    };
  }

  // Processa mensagem do usuário e gera resposta
  async processMessage(userId, message, userLocation = null) {
    try {
      // Salva a mensagem do usuário
      await this.saveUserMessage(userId, message, userLocation);

      // Gera resposta baseada na mensagem
      const response = this.generateResponse(message, userLocation);

      // Salva a resposta do bot
      await this.saveBotResponse(userId, response);

      return {
        success: true,
        response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro no chatbot:', error);
      return {
        success: false,
        response: 'Desculpe, ocorreu um erro. Tente novamente.',
        error: error.message
      };
    }
  }

  // Gera resposta baseada na mensagem do usuário
  generateResponse(message, userLocation) {
    const lowerMessage = message.toLowerCase();
    
    // Saudações
    if (this.containsWords(lowerMessage, ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite'])) {
      return 'Olá! Sou seu assistente agrícola. Posso ajudar com informações sobre culturas, pragas, doenças e técnicas de plantio. O que você gostaria de saber?';
    }

    // Perguntas sobre culturas específicas
    for (const [key, culture] of Object.entries(this.knowledgeBase.cultures)) {
      if (lowerMessage.includes(key)) {
        return this.getCultureInfo(culture, lowerMessage);
      }
    }

    // Problemas e pragas
    if (this.containsWords(lowerMessage, ['praga', 'lagarta', 'pulgão', 'inseto'])) {
      return this.getPestInfo(lowerMessage);
    }

    // Doenças
    if (this.containsWords(lowerMessage, ['doença', 'fungo', 'ferrugem', 'mancha'])) {
      return this.getDiseaseInfo(lowerMessage);
    }

    // Solo
    if (this.containsWords(lowerMessage, ['solo', 'terra', 'ph', 'acidez', 'calagem'])) {
      return this.getSoilInfo(lowerMessage);
    }

    // Plantio
    if (this.containsWords(lowerMessage, ['plantar', 'plantio', 'semear', 'época'])) {
      return this.getPlantingInfo(lowerMessage, userLocation);
    }

    // Irrigação
    if (this.containsWords(lowerMessage, ['água', 'irrigação', 'regar'])) {
      return 'Para irrigação eficiente: monitore a umidade do solo, regue preferencialmente no início da manhã ou final da tarde, use sistemas de gotejamento para economizar água. A necessidade varia conforme a cultura e clima.';
    }

    // Adubação
    if (this.containsWords(lowerMessage, ['adubo', 'fertilizante', 'nutrição'])) {
      return 'Para adubação adequada: faça análise de solo primeiro, use NPK balanceado conforme a cultura, aplique matéria orgânica, respeite as doses recomendadas. Cada cultura tem necessidades específicas.';
    }

    // Resposta genérica
    return 'Posso ajudar com informações sobre: culturas (soja, milho, café, etc.), pragas e doenças, técnicas de plantio, irrigação, adubação e cuidados com o solo. Sobre o que você gostaria de saber?';
  }

  // Verifica se a mensagem contém palavras específicas
  containsWords(message, words) {
    return words.some(word => message.includes(word));
  }

  // Informações sobre culturas
  getCultureInfo(culture, message) {
    let response = `**${culture.name}**\n\n`;
    
    if (message.includes('plantar') || message.includes('época')) {
      response += `🌱 **Época de plantio:** ${culture.plantingPeriod}\n`;
    }
    
    if (message.includes('colheita') || message.includes('harvest')) {
      response += `🌾 **Colheita:** ${culture.harvest}\n`;
    }
    
    if (message.includes('solo')) {
      response += `🌍 **Solo:** ${culture.soilType}\n`;
    }
    
    if (message.includes('clima')) {
      response += `🌤️ **Clima:** ${culture.climate}\n`;
    }
    
    // Se não especificou, mostra informações gerais
    if (!message.includes('plantar') && !message.includes('colheita') && !message.includes('solo') && !message.includes('clima')) {
      response += `🌱 **Plantio:** ${culture.plantingPeriod}\n`;
      response += `🌾 **Colheita:** ${culture.harvest}\n`;
      response += `🌍 **Solo:** ${culture.soilType}\n`;
      response += `📏 **Espaçamento:** ${culture.spacing}\n`;
    }
    
    response += `\n💡 **Dicas:** ${culture.tips}`;
    
    return response;
  }

  // Informações sobre pragas
  getPestInfo(message) {
    let response = '🐛 **Controle de Pragas:**\n\n';
    
    for (const [pest, solution] of Object.entries(this.knowledgeBase.problems.pragas)) {
      if (message.includes(pest)) {
        return `🐛 **${pest.charAt(0).toUpperCase() + pest.slice(1)}:** ${solution}`;
      }
    }
    
    response += 'Principais pragas e controles:\n';
    response += '• **Lagarta:** Controle biológico com Bt\n';
    response += '• **Pulgão:** Predadores naturais ou sistêmicos\n';
    response += '• **Trips:** Armadilhas azuis\n';
    response += '• **Bicudo:** Destruição de restos culturais\n\n';
    response += 'Qual praga específica você quer saber?';
    
    return response;
  }

  // Informações sobre doenças
  getDiseaseInfo(message) {
    let response = '🦠 **Controle de Doenças:**\n\n';
    
    for (const [disease, solution] of Object.entries(this.knowledgeBase.problems.doenças)) {
      if (message.includes(disease)) {
        return `🦠 **${disease.charAt(0).toUpperCase() + disease.slice(1)}:** ${solution}`;
      }
    }
    
    response += 'Principais doenças e controles:\n';
    response += '• **Ferrugem:** Fungicidas preventivos\n';
    response += '• **Antracnose:** Sementes tratadas\n';
    response += '• **Mosaico:** Controle de vetores\n';
    response += '• **Murcha:** Drenagem adequada\n\n';
    response += 'Qual doença específica você quer saber?';
    
    return response;
  }

  // Informações sobre solo
  getSoilInfo(message) {
    let response = '🌍 **Cuidados com Solo:**\n\n';
    
    for (const [problem, solution] of Object.entries(this.knowledgeBase.problems.solo)) {
      if (message.includes(problem)) {
        return `🌍 **${problem.charAt(0).toUpperCase() + problem.slice(1)}:** ${solution}`;
      }
    }
    
    response += 'Principais problemas de solo:\n';
    response += '• **Acidez:** Calagem 60-90 dias antes\n';
    response += '• **Compactação:** Subsolagem\n';
    response += '• **Erosão:** Plantio em curvas de nível\n';
    response += '• **Salinidade:** Drenagem e lavagem\n\n';
    response += 'Que problema de solo você tem?';
    
    return response;
  }

  // Informações sobre plantio
  getPlantingInfo(message, userLocation) {
    let response = '🌱 **Informações de Plantio:**\n\n';
    
    if (userLocation) {
      response += `📍 Baseado na sua localização, as culturas mais adequadas são:\n`;
      // Aqui integraria com o serviço regional
    }
    
    response += 'Épocas de plantio por cultura:\n';
    response += '• **Soja:** Setembro a Dezembro\n';
    response += '• **Milho:** Setembro a Janeiro\n';
    response += '• **Feijão:** Março-Julho (seca), Out-Jan (águas)\n';
    response += '• **Café:** Outubro a Março\n\n';
    response += 'Sobre qual cultura você quer mais detalhes?';
    
    return response;
  }

  // Salva mensagem do usuário no banco
  async saveUserMessage(userId, message, location) {
    try {
      const query = `
        INSERT INTO chat_messages (user_id, message, message_type, location, created_at)
        VALUES ($1, $2, 'user', $3, NOW())
      `;
      
      await db.query(query, [userId, message, location ? JSON.stringify(location) : null]);
    } catch (error) {
      console.log('Erro ao salvar mensagem do usuário:', error.message);
    }
  }

  // Salva resposta do bot no banco
  async saveBotResponse(userId, response) {
    try {
      const query = `
        INSERT INTO chat_messages (user_id, message, message_type, created_at)
        VALUES ($1, $2, 'bot', NOW())
      `;
      
      await db.query(query, [userId, response]);
    } catch (error) {
      console.log('Erro ao salvar resposta do bot:', error.message);
    }
  }

  // Obtém histórico de conversas do usuário
  async getChatHistory(userId, limit = 50) {
    try {
      const query = `
        SELECT message, message_type, location, created_at
        FROM chat_messages
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await db.query(query, [userId, limit]);
      return result.rows.reverse(); // Retorna em ordem cronológica
    } catch (error) {
      console.log('Erro ao obter histórico:', error.message);
      return [];
    }
  }

  // Obtém estatísticas de uso do chatbot
  async getChatStats() {
    try {
      const queries = {
        totalMessages: 'SELECT COUNT(*) as count FROM chat_messages',
        totalUsers: 'SELECT COUNT(DISTINCT user_id) as count FROM chat_messages'
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        try {
          const result = await db.query(query);
          results[key] = result.rows;
        } catch (error) {
          results[key] = [{ count: 0 }];
        }
      }

      return results;
    } catch (error) {
      console.log('Erro ao obter estatísticas:', error.message);
      return {
        totalMessages: [{ count: 0 }],
        totalUsers: [{ count: 0 }]
      };
    }
  }
}

module.exports = new ChatbotService();