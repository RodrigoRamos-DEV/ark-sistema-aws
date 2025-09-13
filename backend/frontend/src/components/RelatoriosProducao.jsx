import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';
import { Icons } from './Icons';

const RelatoriosProducao = () => {
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    tipo: 'produtividade',
    periodo: 'safra_atual',
    formato: 'pdf',
    cultura: 'todas',
    area: 'todas'
  });
  const [culturas, setCulturas] = useState([]);
  const [areas, setAreas] = useState([]);

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [culturasRes, areasRes] = await Promise.all([
        axios.get(`${API_URL}/api/calendario/culturas`, { headers: { 'x-auth-token': token } }),
        axios.get(`${API_URL}/api/calendario/areas`, { headers: { 'x-auth-token': token } })
      ]);
      setCulturas(culturasRes.data);
      setAreas(areasRes.data);
    } catch (error) {
      console.error('Erro ao carregar opções:', error);
    }
  };

  const tiposRelatorio = [
    { value: 'produtividade', label: '📊 Relatório de Produtividade', description: 'Análise detalhada da produtividade por cultura e área' },
    { value: 'custos', label: '💰 Relatório de Custos', description: 'Breakdown completo dos custos de produção' },
    { value: 'calendario', label: '📅 Relatório de Atividades', description: 'Cronograma e status das atividades planejadas' },
    { value: 'comparativo', label: '📈 Relatório Comparativo', description: 'Comparação entre safras e períodos' },
    { value: 'roi', label: '🎯 Análise de ROI', description: 'Retorno sobre investimento por cultura' },
    { value: 'clima', label: '🌦️ Relatório Climático', description: 'Impacto do clima na produção' },
    { value: 'completo', label: '📋 Relatório Completo', description: 'Análise abrangente de toda a operação' }
  ];

  const periodosRelatorio = [
    { value: 'safra_atual', label: 'Safra Atual' },
    { value: 'ultima_safra', label: 'Última Safra' },
    { value: 'ultimas_3_safras', label: 'Últimas 3 Safras' },
    { value: 'ano_atual', label: 'Ano Atual' },
    { value: 'personalizado', label: 'Período Personalizado' }
  ];

  const formatosRelatorio = [
    { value: 'pdf', label: '📄 PDF', icon: '📄' },
    { value: 'excel', label: '📊 Excel', icon: '📊' },
    { value: 'csv', label: '📋 CSV', icon: '📋' },
    { value: 'html', label: '🌐 HTML', icon: '🌐' }
  ];

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/calendario/relatorios/gerar`, filtros, {
        headers: { 'x-auth-token': token },
        responseType: filtros.formato === 'pdf' ? 'blob' : 'json'
      });

      if (filtros.formato === 'pdf') {
        // Download do PDF
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_${filtros.tipo}_${Date.now()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else if (filtros.formato === 'html') {
        // Abrir HTML em nova aba
        const htmlContent = response.data.html;
        const newWindow = window.open();
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      } else {
        // Download de outros formatos
        const blob = new Blob([response.data.content], { 
          type: filtros.formato === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio_${filtros.tipo}_${Date.now()}.${filtros.formato}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }

      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  const agendarRelatorio = async () => {
    try {
      await axios.post(`${API_URL}/api/calendario/relatorios/agendar`, {
        ...filtros,
        frequencia: 'mensal',
        email: true
      }, {
        headers: { 'x-auth-token': token }
      });
      toast.success('Relatório agendado com sucesso!');
    } catch (error) {
      console.error('Erro ao agendar relatório:', error);
      toast.error('Erro ao agendar relatório');
    }
  };

  const RelatorioCard = ({ tipo }) => (
    <div 
      className={`card ${filtros.tipo === tipo.value ? 'selected' : ''}`}
      style={{
        padding: '20px',
        cursor: 'pointer',
        border: filtros.tipo === tipo.value ? '2px solid var(--cor-primaria)' : '1px solid var(--cor-borda)',
        backgroundColor: filtros.tipo === tipo.value ? 'rgba(44, 90, 160, 0.1)' : 'var(--cor-card)',
        transition: 'all 0.3s ease'
      }}
      onClick={() => setFiltros({...filtros, tipo: tipo.value})}
    >
      <h4 style={{ margin: '0 0 10px 0', color: 'var(--cor-primaria)' }}>{tipo.label}</h4>
      <p style={{ margin: 0, fontSize: '14px', color: 'var(--cor-texto-secundario)' }}>{tipo.description}</p>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>📊 Relatórios de Produção</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn" 
            onClick={agendarRelatorio}
            style={{ backgroundColor: '#17a2b8' }}
            disabled={loading}
          >
            <Icons.Calendar /> Agendar
          </button>
          <button 
            className="btn" 
            onClick={gerarRelatorio}
            style={{ backgroundColor: '#28a745' }}
            disabled={loading}
          >
            {loading ? <Icons.Download className="spinning" /> : <Icons.Download />} 
            {loading ? 'Gerando...' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        
        {/* Seleção de tipo de relatório */}
        <div>
          <h3 style={{ marginBottom: '20px' }}>📋 Tipo de Relatório</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            {tiposRelatorio.map(tipo => (
              <RelatorioCard key={tipo.value} tipo={tipo} />
            ))}
          </div>
        </div>

        {/* Configurações do relatório */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h3 style={{ marginBottom: '20px' }}>⚙️ Configurações</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Período:</label>
            <select
              value={filtros.periodo}
              onChange={(e) => setFiltros({...filtros, periodo: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--cor-borda)' }}
            >
              {periodosRelatorio.map(periodo => (
                <option key={periodo.value} value={periodo.value}>{periodo.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Cultura:</label>
            <select
              value={filtros.cultura}
              onChange={(e) => setFiltros({...filtros, cultura: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--cor-borda)' }}
            >
              <option value="todas">Todas as Culturas</option>
              {culturas.map(cultura => (
                <option key={cultura.id} value={cultura.id}>{cultura.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Área:</label>
            <select
              value={filtros.area}
              onChange={(e) => setFiltros({...filtros, area: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--cor-borda)' }}
            >
              <option value="todas">Todas as Áreas</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Formato:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {formatosRelatorio.map(formato => (
                <button
                  key={formato.value}
                  onClick={() => setFiltros({...filtros, formato: formato.value})}
                  style={{
                    padding: '10px',
                    border: filtros.formato === formato.value ? '2px solid var(--cor-primaria)' : '1px solid var(--cor-borda)',
                    borderRadius: '6px',
                    backgroundColor: filtros.formato === formato.value ? 'rgba(44, 90, 160, 0.1)' : 'var(--cor-card)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '5px' }}>{formato.icon}</div>
                  {formato.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview das informações que serão incluídas */}
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px', marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>📋 Conteúdo do Relatório:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: 'var(--cor-texto-secundario)' }}>
              {filtros.tipo === 'produtividade' && (
                <>
                  <li>Produtividade por cultura e área</li>
                  <li>Comparativo com metas planejadas</li>
                  <li>Análise de performance</li>
                  <li>Gráficos de tendência</li>
                </>
              )}
              {filtros.tipo === 'custos' && (
                <>
                  <li>Breakdown de custos por categoria</li>
                  <li>Custo por hectare e por cultura</li>
                  <li>Comparativo orçado vs realizado</li>
                  <li>Análise de eficiência</li>
                </>
              )}
              {filtros.tipo === 'calendario' && (
                <>
                  <li>Cronograma de atividades</li>
                  <li>Status de execução</li>
                  <li>Atividades atrasadas</li>
                  <li>Próximas atividades</li>
                </>
              )}
              {filtros.tipo === 'completo' && (
                <>
                  <li>Resumo executivo</li>
                  <li>Análise de produtividade</li>
                  <li>Controle de custos</li>
                  <li>Cronograma de atividades</li>
                  <li>Análise climática</li>
                  <li>Recomendações</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Relatórios recentes */}
      <div className="card" style={{ marginTop: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>📁 Relatórios Recentes</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
          {[
            { nome: 'Relatório de Produtividade - Safra 2024/25', data: '15/01/2025', tipo: 'PDF', tamanho: '2.3 MB' },
            { nome: 'Análise de Custos - Dezembro 2024', data: '01/01/2025', tipo: 'Excel', tamanho: '1.8 MB' },
            { nome: 'Relatório Completo - Q4 2024', data: '28/12/2024', tipo: 'PDF', tamanho: '4.1 MB' }
          ].map((relatorio, index) => (
            <div key={index} style={{
              padding: '15px',
              border: '1px solid var(--cor-borda)',
              borderRadius: '8px',
              backgroundColor: 'var(--cor-card)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--cor-hover)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--cor-card)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--cor-primaria)' }}>{relatorio.nome}</h4>
                <span style={{ fontSize: '12px', color: 'var(--cor-texto-secundario)' }}>{relatorio.tipo}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--cor-texto-secundario)' }}>
                <div>📅 {relatorio.data}</div>
                <div>📊 {relatorio.tamanho}</div>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                <button style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  border: '1px solid var(--cor-primaria)',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: 'var(--cor-primaria)',
                  cursor: 'pointer'
                }}>
                  📥 Download
                </button>
                <button style={{
                  padding: '4px 8px',
                  fontSize: '10px',
                  border: '1px solid var(--cor-borda)',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: 'var(--cor-texto)',
                  cursor: 'pointer'
                }}>
                  👁️ Visualizar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RelatoriosProducao;