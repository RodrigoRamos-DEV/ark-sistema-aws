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
        clientType: 'empresa'
    });
    const isEditMode = !!clientToEdit;

    useEffect(() => {
        
        const fetchUserProfile = async (clientId) => {
            const token = localStorage.getItem('token');
            console.log('Buscando perfil do usuário para cliente:', clientId);
            
            try {
                const response = await axios.get(`${API_URL}/api/admin/clients/${clientId}/user-profile`, { 
                    headers: { 'x-auth-token': token } 
                });
                
                console.log('Resposta do servidor:', response.data);
                
                if (response.data) {
                    const profile = response.data;
                    console.log('Perfil do usuário encontrado:', profile);
                    console.log('CEP do perfil:', profile.cep);
                    console.log('Endereço do perfil:', profile.endereco);
                    
                    const newData = {
                        whatsapp: profile.whatsapp || profile.contact_phone || clientToEdit?.business_phone || '',
                        endereco_cep: profile.cep || '',
                        endereco_logradouro: profile.endereco || '',
                        endereco_numero: profile.numero || '',
                        endereco_bairro: profile.bairro || '',
                        endereco_cidade: profile.cidade || '',
                        endereco_uf: profile.uf || ''
                    };
                    
                    console.log('Dados que serão atualizados:', newData);
                    
                    setFormData(prev => ({
                        ...prev,
                        ...newData
                    }));
                } else {
                    console.log('Resposta vazia do servidor');
                }
            } catch (error) {
                console.log('Erro ao buscar perfil:', error.response?.status, error.response?.data);
                // Fallback para business_phone se não conseguir buscar perfil
                if (clientToEdit?.business_phone) {
                    setFormData(prev => ({ ...prev, whatsapp: clientToEdit.business_phone }));
                }
            }
        };

        if (isOpen) {
            if (isEditMode) {

                
                setFormData({
                    companyName: clientToEdit.company_name || '',
                    razao_social: clientToEdit.razao_social || '',
                    cnpj: clientToEdit.cnpj || '',
                    inscricao_estadual: clientToEdit.inscricao_estadual || '',
                    inscricao_municipal: clientToEdit.inscricao_municipal || '',
                    responsavel_nome: clientToEdit.responsavel_nome || '',
                    email: clientToEdit.email || '',
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
                    clientType: clientToEdit.client_type || 'empresa'
                });
                
                // Buscar dados do perfil do cliente
                fetchUserProfile(clientToEdit.id);
            } else {
                setFormData({
                    companyName: '',
                    razao_social: '',
                    cnpj: '',
                    inscricao_estadual: '',
                    inscricao_municipal: '',
                    responsavel_nome: '',
                    email: '',
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
            <div style={{ width: '90%', maxWidth: '700px', height: '80vh', overflowY: 'auto', backgroundColor: 'var(--cor-card)', borderRadius: '12px', boxShadow: 'var(--sombra-card)', position: 'relative' }}>
                {/* Botão X fixo no topo */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'var(--cor-texto-claro)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '35px',
                        height: '35px',
                        cursor: 'pointer',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1001,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    title="Fechar"
                >
                    ×
                </button>
                
                <div style={{ padding: '25px' }}>
                    <h2 style={{ margin: '0 0 20px 0', paddingRight: '50px' }}>{isEditMode ? 'Editar Cliente' : 'Criar Novo Cliente'}</h2>
                    <form onSubmit={handleSubmit}>
                    
                    <h4>Tipo de Cliente</h4>
                    <div className="input-group">
                        <label>Tipo de Cliente *</label>
                        <select name="clientType" value={formData.clientType} onChange={handleChange} required>
                            <option value="empresa">Empresa (Sistema Completo)</option>
                            <option value="produtor">Produtor Rural (Marketplace)</option>
                        </select>
                    </div>
                    
                    <h4>Informações {formData.clientType === 'empresa' ? 'da Empresa' : 'do Produtor'}</h4>
                    <div className="input-group">
                        <label>{formData.clientType === 'empresa' ? 'Nome Fantasia' : 'Nome do Produtor'}*</label>
                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} required />
                    </div>
                    {formData.clientType === 'empresa' && (
                        <div className="input-group">
                            <label>Razão Social*</label>
                            <input type="text" name="razao_social" value={formData.razao_social} onChange={handleChange} required />
                        </div>
                    )}
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
                    {formData.clientType === 'produtor' && (
                        <div className="input-group">
                            <label>WhatsApp</label>
                            <input 
                                type="text" 
                                name="whatsapp" 
                                value={formData.whatsapp || ''} 
                                onChange={() => {}} 
                                placeholder={formData.whatsapp ? '' : 'Será preenchido pelo perfil do usuário'}
                                readOnly 
                                style={{
                                    backgroundColor: '#f5f5f5',
                                    color: '#666',
                                    cursor: 'not-allowed'
                                }}
                            />
                        </div>
                    )}

                    
                    <h4>Endereço</h4>
                    <p style={{ fontSize: '0.9em', color: 'var(--cor-texto-claro)', marginBottom: '15px', fontStyle: 'italic' }}>
                        📍 Os campos de endereço são preenchidos automaticamente pelo usuário em seu perfil. {isEditMode && 'Dados já preenchidos aparecem normalmente.'}
                    </p>
                    <div className="grid-2-col">
                        <div className="input-group">
                            <label>CEP</label>
                            <input 
                                type="text" 
                                name="endereco_cep" 
                                value={formData.endereco_cep || ''} 
                                onChange={formData.endereco_cep ? handleChange : () => {}}
                                placeholder={formData.endereco_cep ? '' : 'Preenchido pelo usuário'}
                                readOnly={!formData.endereco_cep}
                                style={{
                                    backgroundColor: formData.endereco_cep ? 'var(--cor-card)' : '#f5f5f5',
                                    color: formData.endereco_cep ? 'var(--cor-texto)' : '#666',
                                    cursor: formData.endereco_cep ? 'default' : 'not-allowed'
                                }}
                            />
                        </div>
                        <div className="input-group">
                            <label>Logradouro (Rua, Av.)</label>
                            <input 
                                type="text" 
                                name="endereco_logradouro" 
                                value={formData.endereco_logradouro || ''} 
                                onChange={formData.endereco_logradouro ? handleChange : () => {}}
                                placeholder={formData.endereco_logradouro ? '' : 'Preenchido pelo usuário'}
                                readOnly={!formData.endereco_logradouro}
                                style={{
                                    backgroundColor: formData.endereco_logradouro ? 'var(--cor-card)' : '#f5f5f5',
                                    color: formData.endereco_logradouro ? 'var(--cor-texto)' : '#666',
                                    cursor: formData.endereco_logradouro ? 'default' : 'not-allowed'
                                }}
                            />
                        </div>
                    </div>
                    <div className="grid-2-col">
                        <div className="input-group">
                            <label>Número</label>
                            <input 
                                type="text" 
                                name="endereco_numero" 
                                value={formData.endereco_numero || ''} 
                                onChange={formData.endereco_numero ? handleChange : () => {}}
                                placeholder={formData.endereco_numero ? '' : 'Preenchido pelo usuário'}
                                readOnly={!formData.endereco_numero}
                                style={{
                                    backgroundColor: formData.endereco_numero ? 'var(--cor-card)' : '#f5f5f5',
                                    color: formData.endereco_numero ? 'var(--cor-texto)' : '#666',
                                    cursor: formData.endereco_numero ? 'default' : 'not-allowed'
                                }}
                            />
                        </div>
                        <div className="input-group">
                            <label>Bairro</label>
                            <input 
                                type="text" 
                                name="endereco_bairro" 
                                value={formData.endereco_bairro || ''} 
                                onChange={formData.endereco_bairro ? handleChange : () => {}}
                                placeholder={formData.endereco_bairro ? '' : 'Preenchido pelo usuário'}
                                readOnly={!formData.endereco_bairro}
                                style={{
                                    backgroundColor: formData.endereco_bairro ? 'var(--cor-card)' : '#f5f5f5',
                                    color: formData.endereco_bairro ? 'var(--cor-texto)' : '#666',
                                    cursor: formData.endereco_bairro ? 'default' : 'not-allowed'
                                }}
                            />
                        </div>
                    </div>
                    <div className="grid-2-col">
                        <div className="input-group">
                            <label>Cidade</label>
                            <input 
                                type="text" 
                                name="endereco_cidade" 
                                value={formData.endereco_cidade || ''} 
                                onChange={formData.endereco_cidade ? handleChange : () => {}}
                                placeholder={formData.endereco_cidade ? '' : 'Preenchido pelo usuário'}
                                readOnly={!formData.endereco_cidade}
                                style={{
                                    backgroundColor: formData.endereco_cidade ? 'var(--cor-card)' : '#f5f5f5',
                                    color: formData.endereco_cidade ? 'var(--cor-texto)' : '#666',
                                    cursor: formData.endereco_cidade ? 'default' : 'not-allowed'
                                }}
                            />
                        </div>
                        <div className="input-group">
                            <label>UF</label>
                            <input 
                                type="text" 
                                name="endereco_uf" 
                                value={formData.endereco_uf || ''} 
                                onChange={formData.endereco_uf ? handleChange : () => {}}
                                placeholder={formData.endereco_uf ? '' : 'Preenchido pelo usuário'}
                                readOnly={!formData.endereco_uf}
                                maxLength="2"
                                style={{
                                    backgroundColor: formData.endereco_uf ? 'var(--cor-card)' : '#f5f5f5',
                                    color: formData.endereco_uf ? 'var(--cor-texto)' : '#666',
                                    cursor: formData.endereco_uf ? 'default' : 'not-allowed'
                                }}
                            />
                        </div>
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
        </div>
    );
}

export default ClientModal;