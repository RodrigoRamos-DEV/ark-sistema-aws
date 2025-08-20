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

    const ADMIN_API_URL = `${API_URL}/api/admin`;
    const token = localStorage.getItem('token');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clientsResponse, dashboardResponse, onlineResponse] = await Promise.all([
                axios.get(`${ADMIN_API_URL}/clients`, { headers: { 'x-auth-token': token } }),
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
    
    const handleOpenModal = (client = null) => {
        setNewToken('');
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const closeConfirmModal = () => {
        setConfirmState({ isOpen: false, onConfirm: null, message: '' });
    };

    const chartData = {
        labels: ['Ativos', 'A Vencer', 'Vencidos'],
        datasets: [{
            data: [
                dashboardData?.summary?.ativos || 0,
                dashboardData?.summary?.a_vencer || 0,
                dashboardData?.summary?.vencidos || 0
            ],
            backgroundColor: [ '#16a34a', '#f59e0b', '#dc2626' ],
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
                                <StatCard title="Ativos" value={dashboardData.summary.ativos} color="#16a34a" />
                                <StatCard title="A Vencer" value={dashboardData.summary.a_vencer} color="#f59e0b" />
                                <StatCard title="Vencidos" value={dashboardData.summary.vencidos} color="#dc2626" />
                            </div>
                            <div className="card grid-2-col" style={{marginTop: '20px'}}>
                                <div>
                                    <h3>Clientes por Status</h3>
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
                        <h3>Clientes Cadastrados</h3>
                        {loading ? <p>A carregar lista de clientes...</p> : (
                            <div style={{overflowX: 'auto'}}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--cor-primaria)' }}>
                                            <th style={{ padding: '10px', textAlign: 'left' }}>Nome</th>
                                            <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                                            <th style={{ padding: '10px', textAlign: 'left' }}>Contato</th>
                                            <th style={{ padding: '10px', textAlign: 'left' }}>Vencimento</th>
                                            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
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
                                                <td style={{ padding: '10px' }}>
                                                    {client.partner_name || 'N/A'}
                                                    {client.client_type !== 'empresa' && client.whatsapp && (
                                                        <div style={{ fontSize: '0.8em', color: '#666' }}>WhatsApp: {client.whatsapp}</div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px' }}>{client.license_expires_at ? new Date(client.license_expires_at).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</td>
                                                <td style={{ padding: '10px' }}>
                                                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.8em', fontWeight: 'bold', ...getStatusStyles(client.license_status) }}>
                                                        {client.license_status}
                                                    </span>
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
                                                    {(client.license_status === 'Vencido' || client.license_status === 'A Vencer') && (
                                                        <button onClick={() => handleRenewLicense(client)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em', marginRight: '10px' }} title="Marcar como Pago e Renovar Licença">💰</button>
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