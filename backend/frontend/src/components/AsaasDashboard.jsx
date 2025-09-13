import React, { useState, useEffect } from 'react';
import asaasService from '../asaasService';

const AsaasDashboard = () => {
  const [stats, setStats] = useState({
    totalPayments: 0,
    pendingPayments: 0,
    receivedPayments: 0,
    overduePayments: 0,
    totalValue: 0
  });
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
    loadStats();
  }, []);

  const testConnection = async () => {
    try {
      const result = await asaasService.testConnection();
      setConnectionStatus(result.success ? 'connected' : 'error');
    } catch (error) {
      setConnectionStatus('error');
    }
  };

  const loadStats = async () => {
    try {
      const payments = await asaasService.getPayments();
      const data = payments.data || [];
      
      const stats = {
        totalPayments: data.length,
        pendingPayments: data.filter(p => p.status === 'PENDING').length,
        receivedPayments: data.filter(p => p.status === 'RECEIVED').length,
        overduePayments: data.filter(p => p.status === 'OVERDUE').length,
        totalValue: data.reduce((sum, p) => sum + parseFloat(p.value || 0), 0)
      };
      
      setStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
    setLoading(false);
  };

  const StatCard = ({ title, value, color, icon }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${color}`}>
      <div className="flex items-center">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-3xl text-gray-400">{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Dashboard Asaas</h1>
        <div className="flex items-center gap-2">
          <span>Status da Conexão:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-800' 
              : connectionStatus === 'error'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {connectionStatus === 'connected' ? 'Conectado' : 
             connectionStatus === 'error' ? 'Erro' : 'Verificando...'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center">Carregando estatísticas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total de Cobranças"
            value={stats.totalPayments}
            color="border-blue-500"
            icon="📊"
          />
          <StatCard
            title="Pendentes"
            value={stats.pendingPayments}
            color="border-yellow-500"
            icon="⏳"
          />
          <StatCard
            title="Recebidas"
            value={stats.receivedPayments}
            color="border-green-500"
            icon="✅"
          />
          <StatCard
            title="Vencidas"
            value={stats.overduePayments}
            color="border-red-500"
            icon="⚠️"
          />
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Valor Total</h2>
        <p className="text-3xl font-bold text-green-600">
          R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Ações Rápidas</h3>
        <div className="flex gap-2">
          <button 
            onClick={testConnection}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Testar Conexão
          </button>
          <button 
            onClick={loadStats}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Atualizar Stats
          </button>
        </div>
      </div>
    </div>
  );
};

export default AsaasDashboard;