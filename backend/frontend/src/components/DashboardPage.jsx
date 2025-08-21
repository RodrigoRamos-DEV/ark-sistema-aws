import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';
import { Icons } from './Icons';
import ClientNotifications from './ClientNotifications';
import PushNotifications from './PushNotifications';

const DashboardCard = ({ title, value, icon, color, trend, subtitle }) => (
  <div className="card" style={{padding: 'clamp(15px, 3vw, 20px)', textAlign: 'center', position: 'relative', minHeight: '120px'}}>
    <div style={{marginBottom: '10px', color: color}}>{icon}</div>
    <h3 style={{margin: '0 0 5px 0', color: color, fontSize: 'clamp(1rem, 3vw, 1.2rem)', wordBreak: 'break-word'}}>{value}</h3>
    <p style={{margin: '0', color: 'var(--cor-texto-secundario)', fontSize: 'clamp(12px, 2.5vw, 14px)'}}>{title}</p>
    {subtitle && <p style={{margin: '5px 0 0 0', fontSize: 'clamp(10px, 2vw, 12px)', color: 'var(--cor-texto-secundario)'}}>{subtitle}</p>}
    {trend && (
      <div style={{position: 'absolute', top: '10px', right: '10px', fontSize: 'clamp(10px, 2vw, 12px)', color: trend > 0 ? '#4caf50' : '#f44336', display: 'flex', alignItems: 'center', gap: '2px'}}>
        {trend > 0 ? <Icons.ChevronUp /> : <Icons.ChevronDown />} {Math.abs(trend)}%
      </div>
    )}
  </div>
);

const AlertCard = ({ type, message, action, onAction }) => {
  const getAlertStyles = () => {
    const isDark = document.body.classList.contains('dark-mode');
    
    if (type === 'warning') {
      return {
        backgroundColor: isDark ? '#3d2914' : '#fff3cd',
        border: `1px solid ${isDark ? '#5a3e1a' : '#ffeaa7'}`,
        color: isDark ? '#ffc107' : '#856404'
      };
    } else if (type === 'danger') {
      return {
        backgroundColor: isDark ? '#2d1b1b' : '#f8d7da',
        border: `1px solid ${isDark ? '#4a2c2c' : '#f5c6cb'}`,
        color: isDark ? '#dc3545' : '#721c24'
      };
    } else {
      return {
        backgroundColor: isDark ? '#1b2d1b' : '#d4edda',
        border: `1px solid ${isDark ? '#2c4a2c' : '#c3e6cb'}`,
        color: isDark ? '#28a745' : '#155724'
      };
    }
  };
  
  return (
    <div style={{
      padding: 'clamp(10px, 2vw, 15px)',
      borderRadius: '8px',
      marginBottom: '10px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '10px',
      ...getAlertStyles()
    }}>
    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
      <span style={{color: type === 'warning' ? '#ffc107' : type === 'danger' ? '#dc3545' : '#28a745'}}>
        {type === 'warning' ? <Icons.AlertCircle /> : type === 'danger' ? <Icons.AlertCircle /> : <Icons.Check />}
      </span>
      {message}
    </div>
    {action && (
      <button 
        onClick={onAction}
        style={{
          padding: '5px 10px',
          fontSize: '12px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          backgroundColor: 'var(--cor-primaria)',
          color: 'white'
        }}
      >
        {action}
      </button>
    )}
  </div>
  );
};

function DashboardPage() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    resumo: {
      vendas_mes: 0,
      compras_mes: 0,
      lucro_mes: 0,
      clientes_ativos: 0,
      produtos_cadastrados: 0,
      notas_fiscais_mes: 0
    },
    vendas_diarias: [],
    produtos_mais_vendidos: [],
    clientes_top: [],
    alertas: []
  });
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('30'); // dias
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);


  const token = localStorage.getItem('token');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchDashboardData();

  }, [periodo]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      console.log('Token atual:', token);
      const response = await axios.get(`${API_URL}/api/data/dashboard`, {
        headers: { 'x-auth-token': token },
        params: { periodo }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };



  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value || 0);

  const COLORS = ['#2c5aa0', '#ff9800', '#4caf50', '#f44336', '#9c27b0', '#00bcd4'];

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: '50px'}}>
        <div style={{fontSize: '2em', marginBottom: '20px'}}>📊</div>
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <PushNotifications />
      <ClientNotifications />
      {/* Ações Rápidas */}
      <div className="card" style={{marginBottom: '20px'}}>
        <h3 style={{marginBottom: '20px'}}>⚡ Ações Rápidas</h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px'}}>
          <button className="btn" onClick={() => {
            navigate('/cadastro');
            setTimeout(() => {
              const event = new CustomEvent('openModal', { detail: { type: 'produtos' } });
              window.dispatchEvent(event);
            }, 100);
          }} style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
            <Icons.Package /> Novo Produto
          </button>
          <button className="btn" onClick={() => {
            navigate('/cadastro');
            setTimeout(() => {
              const event = new CustomEvent('openModal', { detail: { type: 'clientes' } });
              window.dispatchEvent(event);
            }, 100);
          }} style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
            <Icons.Users /> Novo Cliente
          </button>
          <button className="btn" onClick={() => {
            navigate('/lancamentos');
            setTimeout(() => {
              const event = new CustomEvent('openNewTransaction');
              window.dispatchEvent(event);
            }, 100);
          }} style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
            <Icons.DollarSign /> Novo Lançamento
          </button>
          <button className="btn" onClick={() => navigate('/relatorios')} style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
            <Icons.Chart /> Relatórios
          </button>
          <button className="btn" onClick={() => navigate('/profile')} style={{display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center'}}>
            <Icons.Settings /> Configurações
          </button>
        </div>
      </div>

      {/* Header com controles */}
      <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px'}}>
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          style={{padding: '8px'}}
        >
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="365">Último ano</option>
        </select>

        <button
          onClick={fetchDashboardData}
          style={{
            padding: '8px 12px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            backgroundColor: 'var(--cor-primaria)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Icons.Download /> Atualizar
        </button>
      </div>



      {/* Cards de Resumo */}
      <div className="dashboard-cards" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'clamp(10px, 3vw, 20px)', marginBottom: '30px'}}>
        <DashboardCard
          title="Vendas do Período"
          value={formatCurrency(dashboardData.resumo.vendas_mes)}
          icon={<Icons.DollarSign />}
          color="#4caf50"
          trend={12}
        />
        <DashboardCard
          title="Compras do Período"
          value={formatCurrency(dashboardData.resumo.compras_mes)}
          icon={<Icons.Package />}
          color="#f44336"
          trend={-5}
        />
        <DashboardCard
          title="Lucro Líquido"
          value={formatCurrency(dashboardData.resumo.lucro_mes)}
          icon={<Icons.Chart />}
          color="#2c5aa0"
          trend={8}
        />
        <DashboardCard
          title="Clientes Ativos"
          value={dashboardData.resumo.clientes_ativos}
          icon={<Icons.Users />}
          color="#9c27b0"
          subtitle="Este período"
        />
        <DashboardCard
          title="Produtos"
          value={dashboardData.resumo.produtos_cadastrados}
          icon={<Icons.Package />}
          color="#ff9800"
          subtitle="Cadastrados"
        />

      </div>

      {/* Alertas */}
      {dashboardData.alertas.length > 0 && (
        <div className="card" style={{marginBottom: '30px'}}>
          <h3 style={{marginBottom: '15px'}}>🔔 Alertas e Notificações</h3>
          {dashboardData.alertas.map((alerta, index) => (
            <AlertCard
              key={index}
              type={alerta.tipo}
              message={alerta.mensagem}
              action={alerta.acao}
              onAction={() => alerta.callback && alerta.callback()}
            />
          ))}
        </div>
      )}

      {/* Gráficos */}
      <div style={{display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 'clamp(10px, 3vw, 20px)', marginBottom: '30px'}}>
        {/* Gráfico de Vendas Diárias */}
        <div className="card">
          <h3 style={{marginBottom: '20px'}}>📈 Vendas Diárias</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.vendas_diarias}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="vendas" stroke="#4caf50" strokeWidth={2} name="Vendas" />
              <Line type="monotone" dataKey="compras" stroke="#f44336" strokeWidth={2} name="Compras" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Produtos */}
        <div className="card">
          <h3 style={{marginBottom: '20px'}}>🏆 Top Produtos</h3>
          <div style={{maxHeight: '300px', overflowY: 'auto'}}>
            {dashboardData.produtos_mais_vendidos.map((produto, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--cor-borda)'
              }}>
                <div>
                  <div style={{fontWeight: 'bold', fontSize: '14px'}}>{produto.nome}</div>
                  <div style={{fontSize: '12px', color: 'var(--cor-texto-secundario)'}}>
                    {produto.quantidade} vendidos
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontWeight: 'bold', color: '#4caf50'}}>
                    {formatCurrency(produto.total)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráficos Inferiores */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
        {/* Gráfico de Barras - Vendas por Categoria */}
        <div className="card">
          <h3 style={{marginBottom: '20px'}}>📊 Vendas por Categoria</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dashboardData.vendas_por_categoria || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="valor" fill="#2c5aa0" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico Pizza - Clientes Top */}
        <div className="card">
          <h3 style={{marginBottom: '20px'}}>🥧 Top Clientes</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dashboardData.clientes_top}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="valor"
              >
                {dashboardData.clientes_top.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>


    </div>
  );
}

export default DashboardPage;