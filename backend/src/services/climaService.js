const axios = require('axios');

class ClimaService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || 'demo_key';
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
  }

  async getWeatherData(lat, lng) {
    try {
      const [current, forecast] = await Promise.all([
        this.getCurrentWeather(lat, lng),
        this.getForecast(lat, lng)
      ]);

      return {
        current,
        forecast,
        alerts: this.generateAlerts(current, forecast),
        recommendations: this.generateRecommendations(current, forecast)
      };
    } catch (error) {
      console.error('Erro ao buscar dados climáticos:', error);
      return this.getFallbackData();
    }
  }

  async getCurrentWeather(lat, lng) {
    const response = await axios.get(`${this.baseUrl}/weather`, {
      params: {
        lat,
        lon: lng,
        appid: this.apiKey,
        units: 'metric',
        lang: 'pt_br'
      },
      timeout: 5000
    });

    return {
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      pressure: response.data.main.pressure,
      windSpeed: response.data.wind.speed,
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon,
      visibility: response.data.visibility / 1000,
      uvIndex: response.data.uvi || 0,
      location: response.data.name
    };
  }

  async getForecast(lat, lng) {
    const response = await axios.get(`${this.baseUrl}/forecast`, {
      params: {
        lat,
        lon: lng,
        appid: this.apiKey,
        units: 'metric',
        lang: 'pt_br'
      },
      timeout: 5000
    });

    const dailyData = this.processForecastData(response.data.list);
    
    return {
      next5Days: dailyData,
      totalRain5Days: dailyData.reduce((sum, day) => sum + day.rain, 0),
      avgTemp: dailyData.reduce((sum, day) => sum + day.temp, 0) / dailyData.length,
      avgHumidity: dailyData.reduce((sum, day) => sum + day.humidity, 0) / dailyData.length
    };
  }

  processForecastData(forecastList) {
    const dailyData = {};
    
    forecastList.forEach(item => {
      const date = new Date(item.dt * 1000).toLocaleDateString('pt-BR');
      
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          temps: [],
          humidity: [],
          rain: 0,
          wind: []
        };
      }
      
      dailyData[date].temps.push(item.main.temp);
      dailyData[date].humidity.push(item.main.humidity);
      dailyData[date].wind.push(item.wind.speed);
      
      if (item.rain && item.rain['3h']) {
        dailyData[date].rain += item.rain['3h'];
      }
    });

    return Object.values(dailyData).slice(0, 5).map(day => ({
      date: day.date,
      temp: day.temps.reduce((sum, t) => sum + t, 0) / day.temps.length,
      humidity: day.humidity.reduce((sum, h) => sum + h, 0) / day.humidity.length,
      rain: day.rain,
      windSpeed: day.wind.reduce((sum, w) => sum + w, 0) / day.wind.length
    }));
  }

  generateAlerts(current, forecast) {
    const alerts = [];
    
    // Alertas de temperatura
    if (current.temperature > 38) {
      alerts.push({
        type: 'temperature',
        severity: 'high',
        message: '🔥 Calor extremo - risco para culturas sensíveis',
        recommendation: 'Aumentar irrigação e proteger plantas'
      });
    } else if (current.temperature < 2) {
      alerts.push({
        type: 'temperature',
        severity: 'high',
        message: '❄️ Risco de geada iminente',
        recommendation: 'Proteger culturas contra geada'
      });
    }

    // Alertas de chuva
    const totalRain = forecast.totalRain5Days;
    if (totalRain > 80) {
      alerts.push({
        type: 'rain',
        severity: 'medium',
        message: '🌧️ Chuvas intensas previstas',
        recommendation: 'Verificar drenagem e adiar pulverizações'
      });
    } else if (totalRain < 5) {
      alerts.push({
        type: 'rain',
        severity: 'medium',
        message: '🏜️ Período seco prolongado',
        recommendation: 'Planejar irrigação suplementar'
      });
    }

    // Alertas de vento
    if (current.windSpeed > 15) {
      alerts.push({
        type: 'wind',
        severity: 'medium',
        message: '💨 Ventos fortes - risco de danos',
        recommendation: 'Evitar pulverizações e proteger culturas'
      });
    }

    return alerts;
  }

  generateRecommendations(current, forecast) {
    const recommendations = [];
    
    // Recomendações baseadas na temperatura
    if (current.temperature > 30) {
      recommendations.push('Irrigar preferencialmente no início da manhã ou final da tarde');
    } else if (current.temperature < 15) {
      recommendations.push('Monitorar culturas sensíveis ao frio');
    }

    // Recomendações baseadas na umidade
    if (current.humidity > 80) {
      recommendations.push('Monitorar doenças fúngicas devido à alta umidade');
    } else if (current.humidity < 40) {
      recommendations.push('Aumentar irrigação devido à baixa umidade');
    }

    // Recomendações baseadas na previsão
    const nextDayRain = forecast.next5Days[0]?.rain || 0;
    if (nextDayRain > 10) {
      recommendations.push('Adiar aplicações de defensivos devido à chuva prevista');
    } else if (nextDayRain === 0 && current.humidity < 60) {
      recommendations.push('Condições ideais para aplicação de defensivos');
    }

    return recommendations;
  }

  getFallbackData() {
    return {
      current: {
        temperature: 25,
        humidity: 65,
        description: 'Dados climáticos indisponíveis',
        windSpeed: 5,
        pressure: 1013
      },
      forecast: {
        next5Days: Array.from({ length: 5 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          temp: 25 + Math.random() * 10 - 5,
          humidity: 65 + Math.random() * 20 - 10,
          rain: Math.random() * 10
        })),
        totalRain5Days: 15,
        avgTemp: 25
      },
      alerts: [{
        type: 'system',
        severity: 'low',
        message: 'Dados climáticos simulados - configure API OpenWeather',
        recommendation: 'Obtenha chave gratuita em openweathermap.org'
      }],
      recommendations: ['Monitorar clima através de fontes locais']
    };
  }
}

module.exports = new ClimaService();