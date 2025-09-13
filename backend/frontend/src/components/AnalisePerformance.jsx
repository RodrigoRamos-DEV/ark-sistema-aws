import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import API_URL from '../apiConfig';

const AnalisePerformance = () => {
  const [performanceData, setPerformanceData] = useState({
    safras: [],
    comparativo: [],
    produtividade: [],
    custos: [],
    roi: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedSafra, setSelectedSafra] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('produtividade');

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/calendario/performance`, {
        headers: { 'x-auth-token': token }
      });
      setPerformanceData(response.data);
      if (response.data.safras.length > 0) {
        setSelectedSafra(response.data.safras[0].safra);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value || 0);

  const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(value || 0);

  const getPerformanceColor = (performance) => {
    if (performance >= 100) return '#28a745';
    if (performance >= 80) return '#ffc107';
    return '#dc3545';
  };

  const COLORS = ['#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6f42c1'];

  const MetricCard = ({ title, value, subtitle, color, trend }) => (
    <div className="card" style={{ padding: '20px', textAlign: 'center', minHeight: '120px' }}>
      <h4 style={{ margin: '0 0 10px 0', color: 'var(--cor-texto-secundario)', fontSize: '14px' }}>{title}</h4>
      <div style={{ fontSize: '2em', fontWeight: 'bold', color: color, marginBottom: '5px' }}>
        {value}
      </div>
      {subtitle && <p style={{ margin: '0', fontSize: '12px', color: 'var(--cor-texto-secundario)' }}>{subtitle}</p>}
      {trend && (
        <div style={{ marginTop: '10px', fontSize: '12px', color: trend > 0 ? '#28a745' : '#dc3545' }}>
          {trend > 0 ? '↗️' : '↘️'} {Math.abs(trend)}% vs safra anterior
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <div style={{ fontSize: '2em', marginBottom: '20px' }}>📊</div>
        <p>Carregando análise de performance...</p>
      </div>
    );
  }

  const selectedSafraData = performanceData.safras.find(s => s.safra === selectedSafra);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📊 Análise de Performance</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={selectedSafra}
            onChange={(e) => setSelectedSafra(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--cor-borda)' }}
          >
            {performanceData.safras.map(safra => (
              <option key={safra.safra} value={safra.safra}>{safra.safra}</option>
            ))}
          </select>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--cor-borda)' }}
          >
            <option value="produtividade">Produtividade</option>
            <option value="custos">Custos</option>
            <option value="receita">Receita</option>
            <option value="roi">ROI</option>
          </select>
        </div>
      </div>

      {selectedSafraData && (
        <>
          {/* Cards de métricas principais */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <MetricCard
              title="Produtividade Média"
              value={`${formatNumber(selectedSafraData.produtividade_media)} kg/ha`}
              color="#28a745"
              trend={selectedSafraData.trend_produtividade}
            />
            <MetricCard
              title="Custo por Hectare"
              value={formatCurrency(selectedSafraData.custo_medio_ha)}
              color="#17a2b8"
              trend={selectedSafraData.trend_custo}
            />
            <MetricCard
              title="Receita Total"
              value={formatCurrency(selectedSafraData.receita_total)}
              color="#ffc107"
              trend={selectedSafraData.trend_receita}
            />
            <MetricCard
              title="ROI Médio"
              value={`${selectedSafraData.roi_medio}%`}
              color={getPerformanceColor(selectedSafraData.roi_medio)}
              trend={selectedSafraData.trend_roi}
            />
            <MetricCard
              title="Área Plantada"
              value={`${formatNumber(selectedSafraData.area_total)} ha`}
              color="#6f42c1"
            />
          </div>

          {/* Gráficos de análise */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '30px' }}>
            
            {/* Gráfico de comparativo por cultura */}
            <div className="card">
              <h3 style={{ marginBottom: '20px' }}>📈 Performance por Cultura - {selectedSafra}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={selectedSafraData.culturas || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cultura" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'produtividade') return [`${formatNumber(value)} kg/ha`, 'Produtividade'];
                    if (name === 'roi') return [`${value}%`, 'ROI'];
                    return [formatCurrency(value), name];
                  }} />
                  <Legend />
                  {selectedMetric === 'produtividade' && <Bar dataKey="produtividade" fill="#28a745" name="Produtividade (kg/ha)" />}
                  {selectedMetric === 'custos' && <Bar dataKey="custo_ha" fill="#17a2b8" name="Custo/ha" />}
                  {selectedMetric === 'receita' && <Bar dataKey="receita" fill="#ffc107" name="Receita" />}
                  {selectedMetric === 'roi' && <Bar dataKey="roi" fill="#dc3545" name="ROI %" />}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Distribuição de culturas */}
            <div className="card">
              <h3 style={{ marginBottom: '20px' }}>🥧 Distribuição de Área</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={selectedSafraData.culturas || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ cultura, area_ha }) => `${cultura}: ${area_ha}ha`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="area_ha"
                  >
                    {(selectedSafraData.culturas || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} ha`, 'Área']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Evolução histórica */}
          <div className="card" style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '20px' }}>📊 Evolução Histórica</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceData.comparativo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="safra" />
                <YAxis />
                <Tooltip formatter={(value, name) => {
                  if (name === 'produtividade_media') return [`${formatNumber(value)} kg/ha`, 'Produtividade Média'];
                  if (name === 'roi_medio') return [`${value}%`, 'ROI Médio'];
                  return [formatCurrency(value), name];
                }} />
                <Legend />
                <Line type="monotone" dataKey="produtividade_media" stroke="#28a745" strokeWidth={2} name="Produtividade Média" />
                <Line type="monotone" dataKey="custo_medio_ha" stroke="#17a2b8" strokeWidth={2} name="Custo Médio/ha" />
                <Line type="monotone" dataKey="roi_medio" stroke="#dc3545" strokeWidth={2} name="ROI Médio" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Análise detalhada por área */}
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>🗺️ Performance por Área - {selectedSafra}</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--cor-primaria)', color: 'white' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Área</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Cultura</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Hectares</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Produtividade</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Custo/ha</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Receita</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>ROI</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedSafraData.areas || []).map((area, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--cor-borda)' }}>
                      <td style={{ padding: '12px' }}>{area.area_nome}</td>
                      <td style={{ padding: '12px' }}>{area.cultura_nome}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{area.hectares_plantados}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{formatNumber(area.produtividade)} kg/ha</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(area.custo_ha)}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(area.receita)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{area.roi}%</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: getPerformanceColor(area.performance),
                          color: 'white'
                        }}>
                          {area.performance}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights e recomendações */}
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>💡 Insights e Recomendações</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              
              <div style={{ padding: '15px', backgroundColor: '#d4edda', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#155724' }}>✅ Pontos Fortes</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#155724' }}>
                  {selectedSafraData.pontos_fortes?.map((ponto, index) => (
                    <li key={index}>{ponto}</li>
                  )) || []}
                </ul>
              </div>

              <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>⚠️ Pontos de Atenção</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
                  {selectedSafraData.pontos_atencao?.map((ponto, index) => (
                    <li key={index}>{ponto}</li>
                  )) || []}
                </ul>
              </div>

              <div style={{ padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '8px', border: '1px solid #b8daff' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#004085' }}>🚀 Recomendações</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#004085' }}>
                  {selectedSafraData.recomendacoes?.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  )) || []}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {performanceData.safras.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cor-texto-secundario)' }}>
          <div style={{ fontSize: '4em', marginBottom: '20px' }}>📊</div>
          <h3>Nenhuma safra concluída encontrada</h3>
          <p>Complete pelo menos uma safra para visualizar a análise de performance</p>
        </div>
      )}
    </div>
  );
};

export default AnalisePerformance;