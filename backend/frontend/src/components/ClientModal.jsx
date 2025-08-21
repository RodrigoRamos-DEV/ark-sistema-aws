import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../apiConfig';
import { Icons } from './Icons';

function ClientModal({ isOpen, onClose, onSave, clientToEdit }) {
    const [formData, setFormData] = useState({
        companyName: '',
        razao_social: '',
        cnpj: '',
        inscricao_estadual: '',
        inscricao_municipal: '',
        responsavel_nome: '',
        email: '',
        telefone: '',
        whatsapp: '',
        endereco_logradouro: '',
        endereco_numero: '',
        endereco_bairro: '',
        endereco_cidade: '',
        endereco_uf: '',
        endereco_cep: '',
        regime_tributario: 'Simples Nacional',
        licenseStatus: 'Ativo',
        licenseExpiresAt: '',
        vendedorId: '',
        clientType: 'empresa'
    });
    const [vendedores, setVendedores] = useState([]);
    const isEditMode = !!clientToEdit;

    useEffect(() => {
        const fetchVendedores = async () => {
            const token = localStorage.getItem('token');
            try {
                const response = await axios.get(`${API_URL}/api/partners`, { headers: { 'x-auth-token': token } });
                setVendedores(response.data);
            } catch (error) {
                console.error("Erro ao buscar vendedores", error);
            }
        };
        
        const fetchClientProfile = async (clientId) => {
            const token = localStorage.getItem('token');
            try {
                const response = await axios.get(`${API_URL}/api/admin/clients/${clientId}/profile`, { headers: { 'x-auth-token': token } });
                if (response.data.contact_phone) {
                    setFormData(prev => ({ ...prev, whatsapp: response.data.contact_phone }));
                }
            } catch (error) {
                console.log('Perfil não encontrado ou erro:', error);
                // Se não conseguir buscar do perfil, usar o campo business_phone do cliente
                if (clientToEdit?.business_phone) {
                    setFormData(prev => ({ ...prev, whatsapp: clientToEdit.business_phone }));
                }
            }
        };

        if (isOpen) {
            fetchVendedores();
            if (isEditMode) {
                setFormData({
                    companyName: clientToEdit.company_name || '',
                    razao_social: clientToEdit.razao_social || '',
                    cnpj: clientToEdit.cnpj || '',
                    inscricao_estadual: clientToEdit.inscricao_estadual || '',
                    inscricao_municipal: clientToEdit.inscricao_municipal || '',
                    responsavel_nome: clientToEdit.responsavel_nome || '',
                    email: clientToEdit.email || '',
                    telefone: clientToEdit.business_phone || '',
                    whatsapp: clientToEdit.contact_phone || clientToEdit.business_phone || '',
                    endereco_logradouro: clientToEdit.endereco_logradouro || '',
                    endereco_numero: clientToEdit.endereco_numero || '',
                    endereco_bairro: clientToEdit.endereco_bairro || '',
                    endereco_cidade: clientToEdit.endereco_cidade || '',
                    endereco_uf: clientToEdit.endereco_uf || '',
                    endereco_cep: clientToEdit.endereco_cep || '',
                    regime_tributario: clientToEdit.regime_tributario || 'Simples Nacional',
                    licenseStatus: clientToEdit.license_status || 'Ativo',
                    licenseExpiresAt: clientToEdit.license_expires_at ? new Date(clientToEdit.license_expires_at).toISOString().split('T')[0] : '',
                    vendedorId: clientToEdit.vendedor_id || '',
                    clientType: clientToEdit.client_type || 'empresa'
                });
                
                // Buscar WhatsApp do perfil se for produtor
                if (clientToEdit.client_type === 'produtor') {
                    fetchClientProfile(clientToEdit.id);
                }
            } else {
                setFormData({
                    companyName: '',
                    razao_social: '',
                    cnpj: '',
                    inscricao_estadual: '',
                    inscricao_municipal: '',
                    responsavel_nome: '',
                    email: '',
                    telefone: '',
                    whatsapp: '',
                    endereco_logradouro: '',
                    endereco_numero: '',
                    endereco_bairro: '',
                    endereco_cidade: '',
                    endereco_uf: '',
                    endereco_cep: '',
                    regime_tributario: 'Simples Nacional',
                    licenseStatus: 'Ativo',
                    licenseExpiresAt: '',
                    vendedorId: '',
                    clientType: 'empresa'
                });
            }
        }
    }, [isOpen, clientToEdit]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, clientToEdit?.id);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ width: '90%', maxWidth: '700px', height: '80vh', overflowY: 'auto', backgroundColor: 'var(--cor-card)', borderRadius: '12px', boxShadow: 'var(--sombra-card)', padding: '25px' }}>
                <h2 style={{ margin: '0 0 20px 0', padding: '20px 20px 0 20px' }}>{isEditMode ? 'Editar Cliente' : 'Criar Novo Cliente'}</h2>
                <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px 20px' }}>
                    
                    <h4>Tipo de Cliente</h4>
                    <div className="input-group">
                        <label>Tipo de Cliente *</label>
                        <select name="clientType" value={formData.clientType} onChange={handleChange} required>
                            <option value="empresa">Empresa (Sistema Completo)</option>
                            <option value="produtor">Produtor Rural (Marketplace)</option>
                        </select>
                    </div>
                    
                    <h4>Informações {formData.clientType === 'empresa' ? 'da Empresa' : 'do Produtor'}</h4>
                    <div className="grid-2-col">
                        <div className="input-group"><label>{formData.clientType === 'empresa' ? 'Nome Fantasia' : 'Nome do Produtor'}*</label><input type="text" name="companyName" value={formData.companyName} onChange={handleChange} required /></div>
                        <div className="input-group"><label>{formData.clientType === 'empresa' ? 'Razão Social' : 'Nome Completo'}*</label><input type="text" name="razao_social" value={formData.razao_social} onChange={handleChange} required /></div>
                    </div>
                    {formData.clientType === 'empresa' && (
                        <div className="grid-2-col">
                            <div className="input-group"><label>CNPJ</label><input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} /></div>
                            <div className="input-group"><label>Inscrição Estadual</label><input type="text" name="inscricao_estadual" value={formData.inscricao_estadual} onChange={handleChange} /></div>
                        </div>
                    )}

                    <h4>Informações de Contato e Sócio</h4>
                    <div className="grid-2-col">
                        <div className="input-group"><label>Nome do Responsável*</label><input type="text" name="responsavel_nome" value={formData.responsavel_nome} onChange={handleChange} required /></div>
                        <div className="input-group"><label>Email de Login</label><input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Será preenchido pelo usuário" /></div>
                    </div>
                    <div className="grid-2-col">
                        <div className="input-group">
                            <label>Telefone*</label>
                            <input type="text" name="telefone" value={formData.telefone} onChange={handleChange} required />
                        </div>
                        {formData.clientType === 'produtor' && (
                            <div className="input-group">
                                <label>WhatsApp </label>
                                <input 
                                    type="text" 
                                    name="whatsapp" 
                                    value={formData.whatsapp || 'Será preenchido automaticamente'} 
                                    readOnly 
                                    placeholder="Preenchido automaticamente pelo perfil" 
                                    style={{
                                        backgroundColor: '#f5f5f5',
                                        color: '#666',
                                        cursor: 'not-allowed'
                                    }}
                                />
                            </div>
                        )}
                    </div>
                     <div className="input-group">
                        <label>Vendedor Responsável (Opcional)</label>
                        <select name="vendedorId" value={formData.vendedorId} onChange={handleChange}>
                            <option value="">Nenhum</option>
                            {vendedores.map(v => <option key={v.id} value={v.id}>{v.name} ({v.porcentagem}%)</option>)}
                        </select>
                    </div>
                    
                    <h4>Endereço</h4>
                    <div className="grid-2-col">
                        <div className="input-group"><label>CEP</label><input type="text" name="endereco_cep" value={formData.endereco_cep} onChange={handleChange} /></div>
                        <div className="input-group"><label>Logradouro (Rua, Av.)</label><input type="text" name="endereco_logradouro" value={formData.endereco_logradouro} onChange={handleChange} /></div>
                    </div>
                    <div className="grid-2-col">
                        <div className="input-group"><label>Número</label><input type="text" name="endereco_numero" value={formData.endereco_numero} onChange={handleChange} /></div>
                        <div className="input-group"><label>Bairro</label><input type="text" name="endereco_bairro" value={formData.endereco_bairro} onChange={handleChange} /></div>
                    </div>
                    <div className="grid-2-col">
                        <div className="input-group"><label>Cidade</label><input type="text" name="endereco_cidade" value={formData.endereco_cidade} onChange={handleChange} /></div>
                        <div className="input-group"><label>UF</label><input type="text" name="endereco_uf" value={formData.endereco_uf} onChange={handleChange} maxLength="2" /></div>
                    </div>

                    <h4>Dados {formData.clientType === 'empresa' ? 'Fiscais e' : 'de'} Licença</h4>
                    <div className="grid-2-col">
                         {formData.clientType === 'empresa' && (
                             <div className="input-group"><label>Regime Tributário</label><select name="regime_tributario" value={formData.regime_tributario} onChange={handleChange}><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option></select></div>
                         )}
                         <div className="input-group"><label>Data de Vencimento*</label><input type="date" name="licenseExpiresAt" value={formData.licenseExpiresAt} onChange={handleChange} required /></div>
                    </div>
                    {isEditMode && (
                        <div className="input-group">
                            <label>Status da Licença</label>
                            <select name="licenseStatus" value={formData.licenseStatus} onChange={handleChange}>
                                <option value="Ativo">Ativo</option><option value="A Vencer">A Vencer</option><option value="Vencido">Vencido</option>
                            </select>
                        </div>
                    )}
                    
                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button type="button" onClick={onClose} className="btn" style={{ backgroundColor: '#888', width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icons.Cancel /> Cancelar
                        </button>
                        <button type="submit" className="btn" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icons.Save /> Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ClientModal;