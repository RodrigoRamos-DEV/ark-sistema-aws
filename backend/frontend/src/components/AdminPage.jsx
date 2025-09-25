import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import ClientModal from './ClientModal';
import ConfirmModal from './ConfirmModal';
import AdminNotifications from './AdminNotifications';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import API_URL from '../apiConfig';
import OnlineStatusLED from './OnlineStatusLED';

ChartJS.register(ArcElement, Tooltip, Legend);

const StatCard = ({ title, value, color }) => (
    <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
        <h3 style={{ margin: 0, color: 'var(--cor-texto-label)', fontSize: '1em' }}>{title}</h3>
        <p style={{ fontSize: '2.5em', margin: '10px 0', color: color || 'var(--cor-primaria)', fontWeight: 'bold' }}>{value}</p>
    </div>
);

const getStatusStyles = (status) => {
    switch (status) {
        case 'Vencido': return { backgroundColor: '#dc2626', color: 'white' };
        case 'A Vencer': return { backgroundColor: '#f59e0b', color: '#333' };
        case 'Ativo': return { backgroundColor: '#16a34a', color: 'white' };
        default: return { backgroundColor: '#e5e7eb', color: '#333' };
    }
};

function AdminPage() {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [confirmState, setConfirmState] = useState({ isOpen: false, onConfirm: null, message: '' });
    const [newToken, setNewToken] = useState('');
    const [dashboardData, setDashboardData] = useState(null);
    const [activeTab, setActiveTab] = useState('produtores');
    const [onlineStatus, setOnlineStatus] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [filterPlan, setFilterPlan] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const ADMIN_API_URL = `${API_URL}/api/admin`;
    const token = localStorage.getItem('token');

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (sortBy) params.append('sortBy', sortBy);
            if (sortOrder) params.append('sortOrder', sortOrder);
            if (filterPlan) params.append('filterPlan', filterPlan);
            if (filterStatus) params.append('filterStatus', filterStatus);
            
            const [clientsResponse, dashboardResponse, onlineResponse] = await Promise.all([
                axios.get(`${ADMIN_API_URL}/clients?${params.toString()}`, { headers: { 'x-auth-token': token } }),
                axios.get(`${ADMIN_API_URL}/dashboard`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_URL}/api/online/status`, { headers: { 'x-auth-token': token } })
            ]);
            setClients(clientsResponse.data);
            setDashboardData(dashboardResponse.data);
            setOnlineStatus(onlineResponse.data);
        } catch (error) { toast.error("Erro ao carregar dados do painel."); } 
        finally { setLoading(false); }
    };

    useEffect(() => { 
        fetchData(); 
        // Atualizar status online a cada 30 segundos
        const interval = setInterval(() => {
            axios.get(`${API_URL}/api/online/status`, { headers: { 'x-auth-token': token } })
                .then(response => setOnlineStatus(response.data))
                .catch(() => {});
        }, 30000);
        return () => clearInterval(interval);
    }, []);
    
    // Atualizar dados quando filtros mudarem
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300); // Debounce de 300ms
        
        return () => clearTimeout(timeoutId);
    }, [searchTerm, sortBy, sortOrder, filterPlan, filterStatus]);

    const handleSaveClient = async (formData, clientId) => {
        try {
            if (clientId) {
                await axios.put(`${ADMIN_API_URL}/clients/${clientId}`, formData, { headers: { 'x-auth-token': token } });
                toast.success("Cliente atualizado com sucesso!");
            } else {
                const response = await axios.post(`${ADMIN_API_URL}/clients`, formData, { headers: { 'x-auth-token': token } });
                toast.success("Cliente criado com sucesso! Token gerado.");
                setNewToken(response.data.registrationToken);
            }
            fetchData();
            setIsModalOpen(false);
            setEditingClient(null);
        } catch (error) {
            toast.error(error.response?.data?.error || "Erro ao salvar cliente.");
        }
    };

    const handleDeleteClient = (client) => {
        setConfirmState({
            isOpen: true,
            message: `Tem certeza que deseja excluir o cliente "${client.company_name}"? Todos os seus dados serão perdidos permanentemente.`,
            onConfirm: async () => {
                try {
                    await axios.delete(`${ADMIN_API_URL}/clients/${client.id}`, { headers: { 'x-auth-token': token } });
                    toast.success("Cliente excluído com sucesso!");
                    fetchData();
                    closeConfirmModal();
                } catch (error) { toast.error("Erro ao excluir cliente."); closeConfirmModal(); }
            }
        });
    };

    const handleRenewLicense = (client) => {
        setConfirmState({
            isOpen: true,
            message: `Deseja marcar o pagamento como recebido e renovar a licença de "${client.company_name}" por mais 30 dias?`,
            onConfirm: async () => {
                try {
                    await axios.put(`${ADMIN_API_URL}/clients/${client.id}/renew`, {}, { headers: { 'x-auth-token': token } });
                    toast.success("Licença renovada com sucesso!");
                    fetchData();
                    closeConfirmModal();
                } catch (error) { toast.error(error.response?.data?.error || "Erro ao renovar a licença."); closeConfirmModal(); }
            }
        });
    };

    const handleRenewSubscription = (client) => {
        setConfirmState({
            isOpen: true,
            message: `Deseja renovar a assinatura Premium de "${client.company_name}" por mais 30 dias?`,
            onConfirm: async () => {
                try {
                    await axios.put(`${ADMIN_API_URL}/clients/${client.id}/renew-subscription`, {}, { headers: { 'x-auth-token': token } });
                    toast.success("Assinatura renovada com sucesso!");
                    fetchData();
                    closeConfirmModal();
                } catch (error) { toast.error(error.response?.data?.error || "Erro ao renovar assinatura."); closeConfirmModal(); }
            }
        });
    };
    
    const handleOpenModal = (client = null) => {
        setNewToken('');
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const closeConfirmModal = () => {
        setConfirmState({ isOpen: false, onConfirm: null, message: '' });
    };

    const chartData = {
        labels: ['Premium', 'Free'],
        datasets: [{
            data: [
                dashboardData?.summary?.premium || 0,
                dashboardData?.summary?.free || 0
            ],
            backgroundColor: [ '#16a34a', '#6b7280' ],
            borderColor: 'var(--cor-card)',
            borderWidth: 2,
        }]
    };

    return (
        <div>
            <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveClient} clientToEdit={editingClient} />
            <ConfirmModal isOpen={confirmState.isOpen} onClose={closeConfirmModal} onConfirm={confirmState.onConfirm} title="Confirmar Ação">{confirmState.message}</ConfirmModal>

            {newToken && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1001, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="card" style={{width: '90%', maxWidth: '500px', textAlign: 'center'}}>
                        <h3>🔑 Token de Registro</h3>
                        <p>Envie este token para o cliente se registrar. Válido por 7 dias.</p>
                        
                        <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                            <input 
                                type="text" 
                                readOnly 
                                value={newToken} 
                                style={{
                                    textAlign: 'center', 
                                    fontWeight: 'bold', 
                                    fontSize: '1.1em',
                                    border: '2px solid #2c5aa0',
                                    borderRadius: '5px',
                                    padding: '10px',
                                    width: '100%',
                                    backgroundColor: 'white'
                                }}
                            />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button 
                                className="btn" 
                                onClick={() => { 
                                    navigator.clipboard.writeText(newToken); 
                                    toast.success("Token copiado para área de transferência!"); 
                                }}
                                style={{ backgroundColor: '#4caf50' }}
                            >
                                📋 Copiar Token
                            </button>
                            <button 
                                className="btn" 
                                onClick={() => setNewToken('')} 
                                style={{backgroundColor: '#888'}}
                            >
                                Fechar
                            </button>
                        </div>
                        
                        <p style={{ fontSize: '0.9em', color: '#666', marginTop: '15px' }}>
                            📝 O cliente usará este token na tela de registro para criar sua conta.
                        </p>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <h2>Painel do Administrador</h2>
                <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                    <Link to="/admin/partners" className="btn" style={{ width: 'auto', backgroundColor: 'var(--cor-destaque)'}}>
                        Controle Financeiro
                    </Link>
                    <button className="btn" style={{ width: 'auto' }} onClick={() => handleOpenModal()}>+ Novo Cliente</button>
                </div>
            </div>

            {/* Abas de Navegação */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid var(--cor-borda)' }}>
                    <button
                        onClick={() => setActiveTab('produtores')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            backgroundColor: activeTab === 'produtores' ? 'var(--cor-primaria)' : 'transparent',
                            color: activeTab === 'produtores' ? 'white' : 'var(--cor-texto)',
                            cursor: 'pointer',
                            borderRadius: '5px 5px 0 0'
                        }}
                    >
                        🌱 Cliente (Produtor)
                    </button>
                    <button
                        onClick={() => setActiveTab('empresas')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            backgroundColor: activeTab === 'empresas' ? 'var(--cor-primaria)' : 'transparent',
                            color: activeTab === 'empresas' ? 'white' : 'var(--cor-texto)',
                            cursor: 'pointer',
                            borderRadius: '5px 5px 0 0'
                        }}
                    >
                        🏢 Cliente (Empresa)
                    </button>
                    <button
                        onClick={() => setActiveTab('avisos')}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            backgroundColor: activeTab === 'avisos' ? 'var(--cor-primaria)' : 'transparent',
                            color: activeTab === 'avisos' ? 'white' : 'var(--cor-texto)',
                            cursor: 'pointer',
                            borderRadius: '5px 5px 0 0'
                        }}
                    >
                        📢 Avisos aos Clientes
                    </button>
                </div>
            </div>

            {activeTab === 'avisos' && <AdminNotifications />}
            
            {(activeTab === 'empresas' || activeTab === 'produtores') && (
                <>
                    {loading ? <p>A carregar dashboard...</p> : dashboardData && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                <StatCard title="Total de Clientes" value={dashboardData.summary.total_clients} />
                                <StatCard title="Premium" value={dashboardData.summary.premium} color="#16a34a" />
                                <StatCard title="Free" value={dashboardData.summary.free} color="#6b7280" />
                            </div>
                            <div className="card grid-2-col" style={{marginTop: '20px'}}>
                                <div>
                                    <h3>Clientes por Plano</h3>
                                    <div style={{maxWidth: '300px', margin: 'auto'}}>
                                        <Doughnut data={chartData} options={{responsive: true}} />
                                    </div>
                                </div>
                                <div>
                                    <h3>Próximas Renovações (30 dias)</h3>
                                    {dashboardData.upcomingRenewals.length > 0 ? (
                                        <ul style={{listStyle: 'none', padding: 0}}>
                                            {dashboardData.upcomingRenewals.map(client => (
                                                <li key={client.id} style={{display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--cor-borda)'}}>
                                                    <span>{client.company_name}</span>
                                                    <strong>{new Date(client.license_expires_at).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <p>Nenhuma licença a vencer nos próximos 30 dias.</p>}
                                </div>
                            </div>
                        </>
                    )}
                    <div className="card">
                        <h3 style={{ marginBottom: '20px' }}>Clientes Cadastrados</h3>
                        
                        {/* Container dos Filtros */}
                        <div className="filters-container" style={{
                            background: 'var(--cor-fundo-secundario)',
                            padding: '20px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid var(--cor-borda)'
                        }}>
                            {/* Linha 1: Busca */}
                            <div style={{
                                display: 'flex',
                                gap: '10px',
                                marginBottom: '15px',
                                alignItems: 'center',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ flex: '1', minWidth: '250px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar por nome ou email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 15px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--cor-borda)',
                                            fontSize: '14px',
                                            backgroundColor: 'var(--cor-card)'
                                        }}
                                    />
                                </div>
                                <button 
                                    onClick={fetchData}
                                    className="btn"
                                    style={{
                                        padding: '10px 20px',
                                        minWidth: '100px',
                                        backgroundColor: 'var(--cor-primaria)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '14px'
                                    }}
                                >
                                    Buscar
                                </button>
                            </div>
                            
                            {/* Linha 2: Filtros */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '15px',
                                alignItems: 'end'
                            }}>
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: 'var(--cor-texto-label)',
                                        marginBottom: '5px'
                                    }}>Plano</label>
                                    <select 
                                        value={filterPlan} 
                                        onChange={(e) => setFilterPlan(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--cor-borda)',
                                            backgroundColor: 'var(--cor-card)',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="">Todos os planos</option>
                                        <option value="premium">💎 Premium</option>
                                        <option value="free">🆓 Free</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: 'var(--cor-texto-label)',
                                        marginBottom: '5px'
                                    }}>Status</label>
                                    <select 
                                        value={filterStatus} 
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--cor-borda)',
                                            backgroundColor: 'var(--cor-card)',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="">Todos os status</option>
                                        <option value="active">✅ Ativo</option>
                                        <option value="expired">❌ Expirado</option>
                                        <option value="online">🟢 Online</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: 'var(--cor-texto-label)',
                                        marginBottom: '5px'
                                    }}>Ordenar por</label>
                                    <select 
                                        value={sortBy} 
                                        onChange={(e) => setSortBy(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--cor-borda)',
                                            backgroundColor: 'var(--cor-card)',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="name">📝 Nome</option>
                                        <option value="email">📧 Email</option>
                                        <option value="expires">📅 Vencimento</option>
                                        <option value="plan">💎 Plano</option>
                                        <option value="status">🔄 Status</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label style={{
                                        display: 'block',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: 'var(--cor-texto-label)',
                                        marginBottom: '5px'
                                    }}>Direção</label>
                                    <select 
                                        value={sortOrder} 
                                        onChange={(e) => setSortOrder(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--cor-borda)',
                                            backgroundColor: 'var(--cor-card)',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <option value="asc">↑ Crescente</option>
                                        <option value="desc">↓ Decrescente</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <button 
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilterPlan('');
                                            setFilterStatus('');
                                            setSortBy('name');
                                            setSortOrder('asc');
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            background: 'var(--cor-texto-claro)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        🔄 Limpar
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <style>{`
                            @media (max-width: 768px) {
                                .filters-container {
                                    padding: 15px !important;
                                }
                                
                                .filters-container > div:first-child {
                                    flex-direction: column !important;
                                    align-items: stretch !important;
                                }
                                
                                .filters-container > div:first-child > div {
                                    min-width: 100% !important;
                                }
                                
                                .filters-container > div:last-child {
                                    grid-template-columns: 1fr 1fr !important;
                                    gap: 10px !important;
                                }
                            }
                            
                            @media (max-width: 480px) {
                                .filters-container > div:last-child {
                                    grid-template-columns: 1fr !important;
                                }
                            }
                            
                            .filters-container select:focus,
                            .filters-container input:focus {
                                outline: none;
                                border-color: var(--cor-primaria);
                                box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
                            }
                            
                            .filters-container button:hover {
                                opacity: 0.9;
                                transform: translateY(-1px);
                            }
                        `}</style>
                        
                        {loading ? <p>A carregar lista de clientes...</p> : (
                            <div style={{overflowX: 'auto'}}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--cor-primaria)' }}>
                                            <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Nome {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                            <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('email'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                            <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('expires'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Vencimento {sortBy === 'expires' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                            <th style={{ padding: '10px', textAlign: 'left', cursor: 'pointer' }} onClick={() => { setSortBy('plan'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Assinatura {sortBy === 'plan' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                                            <th style={{ padding: '10px', textAlign: 'center' }}>Online</th>
                                            <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clients.filter(client => {
                                            if (activeTab === 'empresas') return client.client_type === 'empresa';
                                            if (activeTab === 'produtores') return client.client_type === 'produtor';
                                            return true;
                                        }).map(client => {
                                            const clientOnlineStatus = onlineStatus.find(status => status.id === client.id);
                                            const isOnline = clientOnlineStatus?.is_online || false;
                                            
                                            return (
                                            <tr key={client.id} style={{ borderBottom: '1px solid var(--cor-borda)' }}>
                                                <td style={{ padding: '10px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '1.2em' }}>
                                                            {client.client_type === 'empresa' ? '🏢' : '🌱'}
                                                        </span>
                                                        {client.company_name}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px' }}>
                                                    {client.email || (
                                                        <span style={{ color: '#ff9800', fontSize: '0.9em' }}>
                                                            🔑 Token pendente
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px' }}>{client.license_expires_at ? new Date(client.license_expires_at).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</td>
                                                <td style={{ padding: '10px' }}>
                                                    {client.subscription_plan ? (
                                                        <div>
                                                            <span style={{ 
                                                                padding: '2px 6px', 
                                                                borderRadius: '8px', 
                                                                fontSize: '0.7em', 
                                                                fontWeight: 'bold',
                                                                backgroundColor: client.subscription_plan === 'premium' ? '#16a34a' : '#6b7280',
                                                                color: 'white'
                                                            }}>
                                                                {client.subscription_plan.toUpperCase()}
                                                            </span>
                                                            <div style={{ fontSize: '0.7em', color: '#666', marginTop: '2px' }}>
                                                                {client.subscription_status?.toUpperCase()}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '0.8em', color: '#999' }}>Sem assinatura</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                        <OnlineStatusLED isOnline={isOnline} size={14} />
                                                        <span style={{ fontSize: '0.8em', color: '#666' }}>
                                                            {isOnline ? 'Online' : 'Offline'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>
                                                    {!client.email && (
                                                        <button 
                                                            onClick={async () => {
                                                                try {
                                                                    const response = await axios.get(`${ADMIN_API_URL}/clients/${client.id}/token`, { headers: { 'x-auth-token': token } });
                                                                    setNewToken(response.data.registrationToken);
                                                                } catch (error) {
                                                                    toast.error('Erro ao buscar token');
                                                                }
                                                            }} 
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px', color: '#ff9800' }} 
                                                            title="Ver Token de Registro"
                                                        >
                                                            🔑
                                                        </button>
                                                    )}

                                                    {client.email && (client.subscription_status === 'expired' || !client.subscription_plan) && (
                                                        <button onClick={() => handleRenewSubscription(client)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px' }} title="Renovar Assinatura Premium">🔄</button>
                                                    )}
                                                    <button onClick={() => handleOpenModal(client)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px' }} title="Editar">✏️</button>
                                                    <button onClick={() => handleDeleteClient(client)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }} title="Excluir">🗑️</button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
            

        </div>
    );
}

export default AdminPage;