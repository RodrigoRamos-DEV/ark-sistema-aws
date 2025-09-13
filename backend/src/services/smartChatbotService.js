const axios = require('axios');
const db = require('../config/database');
const priceService = require('./priceService');

class SmartChatbotService {
  constructor() {
    this.openWeatherKey = process.env.OPENWEATHER_API_KEY;
    this.openAIKey = process.env.OPENAI_API_KEY; // Adicionar no .env
  }

  async processMessage(userId, message, userLocation = null) {
    try {
      await this.saveUserMessage(userId, message, userLocation);

      // Obter dados contextuais
      const context = await this.gatherContext(message, userLocation);
      
      // Gerar resposta inteligente
      const response = await this.generateSmartResponse(message, context);

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

  async gatherContext(message, userLocation) {
    const context = {
      weather: null,
      season: this.getCurrentSeason(),
      location: userLocation,
      prices: null,
      recommendations: null
    };

    try {
      // Dados do clima se tiver localização
      if (userLocation) {
        context.weather = await this.getWeatherData(userLocation);
      }

      // Dados de preços se mencionar culturas específicas
      const crops = this.extractCropsFromMessage(message);
      if (crops.length > 0) {
        context.prices = await this.getPriceData(crops);
      }

      // Recomendações baseadas na época
      context.recommendations = await this.getSeasonalRecommendations();

    } catch (error) {
      console.log('Erro ao obter contexto:', error.message);
    }

    return context;
  }

  async getWeatherData(location) {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lng}&appid=${this.openWeatherKey}&units=metric&lang=pt_br`
      );

      const forecast = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lng}&appid=${this.openWeatherKey}&units=metric&lang=pt_br`
      );

      return {
        current: {
          temp: response.data.main.temp,
          humidity: response.data.main.humidity,
          description: response.data.weather[0].description,
          city: response.data.name
        },
        forecast: forecast.data.list.slice(0, 5).map(item => ({
          date: new Date(item.dt * 1000).toLocaleDateString('pt-BR'),
          temp: item.main.temp,
          rain: item.rain ? item.rain['3h'] || 0 : 0,
          description: item.weather[0].description
        }))
      };
    } catch (error) {
      console.log('Erro ao obter dados do clima:', error.message);
      return null;
    }
  }

  async getPriceData(crops) {
    try {
      const allPrices = await priceService.getCurrentPrices();
      const prices = {};
      
      crops.forEach(crop => {
        if (allPrices[crop]) {
          prices[crop] = allPrices[crop];
        }
      });

      return prices;
    } catch (error) {
      console.log('Erro ao obter preços:', error.message);
      return {};
    }
  }

  async getSeasonalRecommendations() {
    const month = new Date().getMonth() + 1;
    const recommendations = {
      1: ['milho safrinha', 'feijão', 'hortaliças'],
      2: ['milho safrinha', 'feijão', 'hortaliças'],
      3: ['feijão seca', 'trigo', 'hortaliças de inverno'],
      4: ['feijão seca', 'trigo', 'aveia'],
      5: ['trigo', 'aveia', 'centeio'],
      6: ['trigo', 'aveia', 'preparação para plantio'],
      7: ['preparação do solo', 'análise de solo'],
      8: ['preparação do solo', 'análise de solo'],
      9: ['soja', 'milho', 'algodão'],
      10: ['soja', 'milho', 'algodão', 'café'],
      11: ['soja', 'milho', 'café'],
      12: ['milho', 'café', 'hortaliças de verão']
    };

    return recommendations[month] || [];
  }

  extractCropsFromMessage(message) {
    const crops = ['soja', 'milho', 'café', 'algodão', 'feijão', 'trigo', 'cana', 'tomate', 'alface'];
    const lowerMessage = message.toLowerCase();
    return crops.filter(crop => lowerMessage.includes(crop));
  }

  getCurrentSeason() {
    const month = new Date().getMonth() + 1;
    if (month >= 12 || month <= 2) return 'verão';
    if (month >= 3 && month <= 5) return 'outono';
    if (month >= 6 && month <= 8) return 'inverno';
    return 'primavera';
  }

  async generateSmartResponse(message, context) {
    const lowerMessage = message.toLowerCase();

    // Saudações
    if (this.containsWords(lowerMessage, ['oi', 'olá', 'bom dia', 'boa tarde'])) {
      let response = 'Olá! Sou seu assistente agrícola inteligente. ';
      if (context.weather) {
        response += `Vejo que você está em ${context.weather.current.city}, onde está ${context.weather.current.temp}°C e ${context.weather.current.description}. `;
      }
      response += 'Posso ajudar com recomendações de plantio, preços e análise climática. O que você gostaria de saber?';
      return response;
    }

    // Recomendações de plantio
    if (this.containsWords(lowerMessage, ['plantar', 'plantio', 'época', 'quando'])) {
      return this.getPlantingRecommendations(context);
    }

    // Preços
    if (this.containsWords(lowerMessage, ['preço', 'valor', 'cotação', 'mercado'])) {
      return this.getPriceAnalysis(context);
    }

    // Clima
    if (this.containsWords(lowerMessage, ['clima', 'tempo', 'chuva', 'temperatura'])) {
      return this.getWeatherAnalysis(context);
    }

    // Análise econômica
    if (this.containsWords(lowerMessage, ['viabilidade', 'lucro', 'rentabilidade', 'análise econômica'])) {
      return this.getEconomicAnalysis(context, message);
    }

    // Culturas específicas
    const crops = this.extractCropsFromMessage(message);
    if (crops.length > 0) {
      return this.getCropSpecificAdvice(crops[0], context);
    }

    return 'Posso ajudar com:\n• 🌱 Recomendações de plantio baseadas no clima\n• 💰 Análise de preços e viabilidade econômica\n• 🌤️ Previsão do tempo para agricultura\n• 🌾 Dicas específicas por cultura\n\nSobre o que você gostaria de saber?';
  }

  getPlantingRecommendations(context) {
    let response = '🌱 **Recomendações de Plantio Atuais:**\n\n';
    
    const month = new Date().getMonth() + 1;
    const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long' });
    
    response += `📅 **${monthName.charAt(0).toUpperCase() + monthName.slice(1)}** é ideal para:\n`;
    
    if (context.recommendations) {
      context.recommendations.forEach(crop => {
        response += `• ${crop.charAt(0).toUpperCase() + crop.slice(1)}\n`;
      });
    }

    if (context.weather) {
      response += `\n🌤️ **Condições Atuais em ${context.weather.current.city}:**\n`;
      response += `• Temperatura: ${context.weather.current.temp}°C\n`;
      response += `• Umidade: ${context.weather.current.humidity}%\n`;
      response += `• Condição: ${context.weather.current.description}\n`;

      if (context.weather.forecast) {
        response += '\n📊 **Previsão para os próximos dias:**\n';
        context.weather.forecast.slice(0, 3).forEach(day => {
          response += `• ${day.date}: ${day.temp}°C, ${day.description}\n`;
        });
      }
    }

    response += '\n💡 **Dica:** Considere sempre a análise de solo e histórico de preços antes de decidir o plantio!';
    
    return response;
  }

  getPriceAnalysis(context) {
    let response = '💰 **Análise de Preços Agrícolas:**\n\n';
    
    if (context.prices && Object.keys(context.prices).length > 0) {
      Object.entries(context.prices).forEach(([crop, data]) => {
        const trend = data.trend === 'alta' ? '📈' : data.trend === 'baixa' ? '📉' : '➡️';
        response += `${trend} **${crop.toUpperCase()}:**\n`;
        response += `• Preço atual: R$ ${data.current}/saca\n`;
        response += `• Mês anterior: R$ ${data.lastMonth}/saca\n`;
        response += `• Tendência: ${data.trend}\n\n`;
      });
    } else {
      response += '📊 **Principais Commodities (Estimativa):**\n';
      response += '• Soja: R$ 150,50/saca (tendência alta)\n';
      response += '• Milho: R$ 85,30/saca (estável)\n';
      response += '• Café: R$ 1.250,00/saca (alta)\n';
      response += '• Feijão: R$ 320,00/saca (alta)\n\n';
    }
    
    response += '💡 **Dica:** Monitore os preços semanalmente e considere contratos futuros para proteção!';
    
    return response;
  }

  getWeatherAnalysis(context) {
    if (!context.weather) {
      return '🌤️ Para análise climática personalizada, permita o acesso à sua localização. Posso fornecer previsões específicas para sua região!';
    }

    let response = `🌤️ **Análise Climática - ${context.weather.current.city}:**\n\n`;
    response += `🌡️ **Agora:** ${context.weather.current.temp}°C, ${context.weather.current.description}\n`;
    response += `💧 **Umidade:** ${context.weather.current.humidity}%\n\n`;

    response += '📅 **Previsão para agricultura:**\n';
    context.weather.forecast.forEach(day => {
      const rainIcon = day.rain > 0 ? '🌧️' : '☀️';
      response += `${rainIcon} ${day.date}: ${day.temp}°C`;
      if (day.rain > 0) response += `, chuva: ${day.rain}mm`;
      response += '\n';
    });

    // Recomendações baseadas no clima
    const temp = context.weather.current.temp;
    const humidity = context.weather.current.humidity;

    response += '\n💡 **Recomendações:**\n';
    if (temp > 30) {
      response += '• Temperatura alta: aumente irrigação\n';
    }
    if (humidity > 80) {
      response += '• Alta umidade: monitore fungos\n';
    }
    if (temp < 15) {
      response += '• Temperatura baixa: proteja culturas sensíveis\n';
    }

    return response;
  }

  getCropSpecificAdvice(crop, context) {
    const cropData = {
      'soja': {
        name: 'Soja',
        season: 'Set-Dez',
        harvest: '120-140 dias',
        idealTemp: '20-30°C',
        tips: 'Monitore ferrugem asiática, faça rotação com milho'
      },
      'milho': {
        name: 'Milho',
        season: 'Set-Jan',
        harvest: '90-120 dias',
        idealTemp: '15-35°C',
        tips: 'Atenção à lagarta-do-cartucho, irrigação no pendoamento'
      },
      'café': {
        name: 'Café',
        season: 'Out-Mar',
        harvest: '3-4 anos',
        idealTemp: '18-22°C',
        tips: 'Controle broca e ferrugem, poda anual necessária'
      }
    };

    const data = cropData[crop];
    if (!data) return 'Cultura não encontrada na base de dados.';

    let response = `☕ **${data.name}:**\n\n`;
    response += `🌱 **Plantio:** ${data.season}\n`;
    response += `🌾 **Colheita:** ${data.harvest}\n`;
    response += `🌡️ **Temperatura ideal:** ${data.idealTemp}\n`;

    if (context.prices && context.prices[crop]) {
      const price = context.prices[crop];
      response += `💰 **Preço atual:** R$ ${price.current}/saca (${price.trend})\n`;
    }

    if (context.weather) {
      const temp = context.weather.current.temp;
      const idealRange = data.idealTemp.split('-').map(t => parseInt(t.replace('°C', '')));
      
      if (temp >= idealRange[0] && temp <= idealRange[1]) {
        response += `✅ **Temperatura atual (${temp}°C) está ideal para ${data.name}**\n`;
      } else {
        response += `⚠️ **Temperatura atual (${temp}°C) fora do ideal para ${data.name}**\n`;
      }
    }

    response += `\n💡 **Dicas:** ${data.tips}`;

    return response;
  }

  async getEconomicAnalysis(context, message) {
    const crops = this.extractCropsFromMessage(message);
    const crop = crops[0] || 'soja';
    
    try {
      const analysis = await priceService.getEconomicAnalysis(crop, 1);
      
      if (analysis.error) {
        return `Não foi possível analisar a viabilidade de ${crop}. Tente com: soja, milho, café, feijão ou trigo.`;
      }

      let response = `💰 **Análise Econômica - ${crop.toUpperCase()}:**\n\n`;
      response += `📊 **Preço atual:** R$ ${analysis.currentPrice}/${analysis.productivity > 50 ? 'saca' : 'kg'}\n`;
      response += `🌾 **Produtividade média:** ${analysis.productivity} sacas/hectare\n`;
      response += `💵 **Receita bruta:** R$ ${analysis.grossRevenue.toLocaleString('pt-BR')}/hectare\n`;
      response += `💸 **Custos totais:** R$ ${analysis.totalCosts.toLocaleString('pt-BR')}/hectare\n`;
      response += `💰 **Lucro líquido:** R$ ${analysis.netProfit.toLocaleString('pt-BR')}/hectare\n`;
      response += `📈 **Margem de lucro:** ${analysis.profitMargin}%\n\n`;
      response += `💡 **Recomendação:** ${analysis.recommendation}`;
      
      return response;
    } catch (error) {
      return 'Erro ao calcular análise econômica. Tente novamente.';
    }
  }

  containsWords(message, words) {
    return words.some(word => message.includes(word));
  }

  async saveUserMessage(userId, message, location) {
    try {
      const query = `
        INSERT INTO chat_messages (user_id, message, message_type, location, created_at)
        VALUES ($1, $2, 'user', $3, NOW())
      `;
      await db.query(query, [userId, message, location ? JSON.stringify(location) : null]);
    } catch (error) {
      console.log('Erro ao salvar mensagem:', error.message);
    }
  }

  async saveBotResponse(userId, response) {
    try {
      const query = `
        INSERT INTO chat_messages (user_id, message, message_type, created_at)
        VALUES ($1, $2, 'bot', NOW())
      `;
      await db.query(query, [userId, response]);
    } catch (error) {
      console.log('Erro ao salvar resposta:', error.message);
    }
  }
}

module.exports = new SmartChatbotService();