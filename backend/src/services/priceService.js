const axios = require('axios');

class PriceService {
  constructor() {
    // URLs das APIs de preços (algumas são públicas, outras precisam de cadastro)
    this.apis = {
      cepea: 'https://www.cepea.esalq.usp.br/br/indicador/',
      ibge: 'https://servicodados.ibge.gov.br/api/v3/agregados/',
      ceagesp: 'http://www.ceagesp.gov.br/comunicacao/cotacoes/'
    };
  }

  // Simula dados de preços com base em dados reais aproximados
  async getCurrentPrices() {
    try {
      // Em produção, aqui faria chamadas para APIs reais
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      
      // Preços simulados baseados em médias históricas (R$/saca ou R$/kg)
      const basePrices = {
        'soja': this.calculateSeasonalPrice(150, month, 'soja'),
        'milho': this.calculateSeasonalPrice(85, month, 'milho'),
        'café': this.calculateSeasonalPrice(1200, month, 'café'),
        'algodão': this.calculateSeasonalPrice(8.5, month, 'algodão'),
        'feijão': this.calculateSeasonalPrice(320, month, 'feijão'),
        'trigo': this.calculateSeasonalPrice(95, month, 'trigo'),
        'arroz': this.calculateSeasonalPrice(75, month, 'arroz'),
        'cana': this.calculateSeasonalPrice(45, month, 'cana')
      };

      // Adiciona tendências e dados históricos
      const enrichedPrices = {};
      for (const [crop, price] of Object.entries(basePrices)) {
        enrichedPrices[crop] = {
          current: price,
          lastMonth: price * (0.95 + Math.random() * 0.1), // Variação de -5% a +5%
          lastYear: price * (0.85 + Math.random() * 0.3), // Variação maior para ano anterior
          trend: this.calculateTrend(price, price * 0.98),
          unit: this.getUnit(crop),
          lastUpdate: currentDate.toISOString()
        };
      }

      return enrichedPrices;
    } catch (error) {
      console.error('Erro ao obter preços:', error);
      return this.getFallbackPrices();
    }
  }

  calculateSeasonalPrice(basePrice, month, crop) {
    // Ajusta preços baseado na sazonalidade
    const seasonalFactors = {
      'soja': {
        1: 1.05, 2: 1.08, 3: 1.10, 4: 1.05, 5: 0.95, 6: 0.90,
        7: 0.88, 8: 0.85, 9: 0.90, 10: 0.95, 11: 1.00, 12: 1.02
      },
      'milho': {
        1: 0.95, 2: 0.90, 3: 0.88, 4: 0.92, 5: 0.98, 6: 1.05,
        7: 1.10, 8: 1.15, 9: 1.08, 10: 1.00, 11: 0.98, 12: 0.96
      },
      'café': {
        1: 1.02, 2: 1.05, 3: 1.08, 4: 1.10, 5: 1.12, 6: 1.08,
        7: 1.05, 8: 1.00, 9: 0.98, 10: 0.95, 11: 0.98, 12: 1.00
      }
    };

    const factor = seasonalFactors[crop]?.[month] || 1.0;
    const randomVariation = 0.95 + Math.random() * 0.1; // ±5% de variação aleatória
    
    return Math.round(basePrice * factor * randomVariation * 100) / 100;
  }

  calculateTrend(current, previous) {
    const change = ((current - previous) / previous) * 100;
    if (change > 2) return 'alta';
    if (change < -2) return 'baixa';
    return 'estável';
  }

  getUnit(crop) {
    const units = {
      'soja': 'saca 60kg',
      'milho': 'saca 60kg',
      'café': 'saca 60kg',
      'algodão': 'arroba 15kg',
      'feijão': 'saca 60kg',
      'trigo': 'saca 60kg',
      'arroz': 'saca 50kg',
      'cana': 'tonelada'
    };
    return units[crop] || 'kg';
  }

  getFallbackPrices() {
    return {
      'soja': { current: 150.50, lastMonth: 145.20, trend: 'alta', unit: 'saca 60kg' },
      'milho': { current: 85.30, lastMonth: 84.90, trend: 'estável', unit: 'saca 60kg' },
      'café': { current: 1250.00, lastMonth: 1180.00, trend: 'alta', unit: 'saca 60kg' }
    };
  }

  // Análise de viabilidade econômica
  async getEconomicAnalysis(crop, hectares = 1) {
    try {
      const prices = await this.getCurrentPrices();
      const cropData = prices[crop];
      
      if (!cropData) {
        return { error: 'Cultura não encontrada' };
      }

      // Dados de produtividade média (sacas/hectare)
      const productivity = {
        'soja': 55,
        'milho': 95,
        'café': 25,
        'feijão': 18,
        'trigo': 35
      };

      const avgProductivity = productivity[crop] || 30;
      const grossRevenue = cropData.current * avgProductivity * hectares;
      
      // Custos estimados (R$/hectare)
      const costs = {
        'soja': 3500,
        'milho': 4200,
        'café': 8000,
        'feijão': 2800,
        'trigo': 3200
      };

      const totalCosts = (costs[crop] || 3000) * hectares;
      const netProfit = grossRevenue - totalCosts;
      const profitMargin = (netProfit / grossRevenue) * 100;

      return {
        crop,
        hectares,
        currentPrice: cropData.current,
        productivity: avgProductivity,
        grossRevenue,
        totalCosts,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        recommendation: this.getRecommendation(profitMargin, cropData.trend)
      };
    } catch (error) {
      console.error('Erro na análise econômica:', error);
      return { error: 'Erro ao calcular análise econômica' };
    }
  }

  getRecommendation(profitMargin, trend) {
    if (profitMargin > 20 && trend === 'alta') {
      return 'Excelente momento para plantio - alta rentabilidade e preços em alta';
    } else if (profitMargin > 15) {
      return 'Bom momento para plantio - rentabilidade adequada';
    } else if (profitMargin > 5) {
      return 'Momento moderado - analise custos e considere otimizações';
    } else {
      return 'Cuidado - baixa rentabilidade, considere outras culturas';
    }
  }

  // Histórico de preços (simulado)
  async getPriceHistory(crop, months = 12) {
    const history = [];
    const currentDate = new Date();
    const prices = await this.getCurrentPrices();
    const currentPrice = prices[crop]?.current || 100;

    for (let i = months; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      // Simula variação histórica
      const variation = 0.8 + Math.random() * 0.4; // ±20% de variação
      const price = Math.round(currentPrice * variation * 100) / 100;
      
      history.push({
        date: date.toISOString().split('T')[0],
        price,
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      });
    }

    return history;
  }
}

module.exports = new PriceService();