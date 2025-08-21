import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig';
import QRCode from 'qrcode';

function ProfilePage() {
    const [profileData, setProfileData] = useState({
        company_name: '',
        cnpj_cpf: '',
        contact_phone: '',
        email: '',
        pix: '',
        full_address: '',
        website: '',
        inscricao_estadual: '',
        inscricao_municipal: '',
        cep: '',
        endereco_rua: '',
        endereco_numero: '',
        endereco_bairro: '',
        endereco_cidade: '',
        endereco_uf: '',
        cor_tema: '#2c5aa0'
    });
    const [logoPreview, setLogoPreview] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const token = localStorage.getItem('token');
    const DATA_API_URL = `${API_URL}/api/data`;

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axios.get(`${DATA_API_URL}/profile`, { headers: { 'x-auth-token': token } });
                setProfileData(response.data);
                
                if (response.data.logo_url) {
                    setLogoPreview(response.data.logo_url);
                }

                
                // Gerar QR Code
                if (response.data.pix || response.data.email || response.data.contact_phone) {
                    const qrData = response.data.pix || response.data.email || response.data.contact_phone;
                    QRCode.toDataURL(qrData, { width: 80, margin: 1 })
                        .then(url => setQrCodeUrl(url))
                        .catch(() => setQrCodeUrl(''));
                }

            } catch (error) {
                toast.error("Erro ao carregar os dados do perfil.");
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [token]);

    const handleInputChange = async (e) => {
        const { name, value } = e.target;
        
        if (name === 'cnpj_cpf') {
            const numbers = value.replace(/\D/g, '');
            let formatted = '';
            if (numbers.length <= 11) {
                formatted = numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
            } else {
                formatted = numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
            }
            setProfileData({ ...profileData, [name]: formatted });
        } else if (name === 'contact_phone') {
            const numbers = value.replace(/\D/g, '');
            const formatted = numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            setProfileData({ ...profileData, [name]: formatted });
        } else if (name === 'cep') {
            const numbers = value.replace(/\D/g, '');
            const formatted = numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
            const newData = { ...profileData, [name]: formatted };
            setProfileData(newData);
            
            if (numbers.length === 8) {
                try {
                    const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
                    const data = await response.json();
                    if (!data.erro) {
                        setProfileData(prev => ({
                            ...prev,
                            endereco_rua: data.logradouro || '',
                            endereco_bairro: data.bairro || '',
                            endereco_cidade: data.localidade || '',
                            endereco_uf: data.uf || ''
                        }));
                    }
                } catch (error) {
                    console.log('Erro ao buscar CEP:', error);
                }
            }
        } else if (name === 'pix') {
            setProfileData({ ...profileData, [name]: value });
            // Gerar QR Code em tempo real
            if (value.trim()) {
                QRCode.toDataURL(value, { width: 80, margin: 1 })
                    .then(url => setQrCodeUrl(url))
                    .catch(() => setQrCodeUrl(''));
            } else {
                setQrCodeUrl('');
            }
        } else {
            setProfileData({ ...profileData, [name]: value });
        }
    };
    
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
    
    const validateCpfCnpj = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length === 11) {
            // Validação CPF
            if (numbers === '00000000000') return false;
            let sum = 0;
            for (let i = 0; i < 9; i++) sum += parseInt(numbers[i]) * (10 - i);
            let digit1 = 11 - (sum % 11);
            if (digit1 > 9) digit1 = 0;
            if (parseInt(numbers[9]) !== digit1) return false;
            sum = 0;
            for (let i = 0; i < 10; i++) sum += parseInt(numbers[i]) * (11 - i);
            let digit2 = 11 - (sum % 11);
            if (digit2 > 9) digit2 = 0;
            return parseInt(numbers[10]) === digit2;
        } else if (numbers.length === 14) {
            // Validação CNPJ
            if (numbers === '00000000000000') return false;
            const weights1 = [5,4,3,2,9,8,7,6,5,4,3,2];
            const weights2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
            let sum = 0;
            for (let i = 0; i < 12; i++) sum += parseInt(numbers[i]) * weights1[i];
            let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
            if (parseInt(numbers[12]) !== digit1) return false;
            sum = 0;
            for (let i = 0; i < 13; i++) sum += parseInt(numbers[i]) * weights2[i];
            let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
            return parseInt(numbers[13]) === digit2;
        }
        return false;
    };
    
    const validatePix = (value) => {
        if (!value) return true;
        const cleanValue = value.trim();
        // CPF/CNPJ
        if (/^\d{11}$|^\d{14}$/.test(cleanValue.replace(/\D/g, ''))) return true;
        // Email
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue)) return true;
        // Telefone
        if (/^\+?\d{10,15}$/.test(cleanValue.replace(/\D/g, ''))) return true;
        // Chave aleatória (32 caracteres)
        if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cleanValue)) return true;
        return false;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        const formData = new FormData();
        formData.append('companyName', profileData.company_name);
        formData.append('cnpjCpf', profileData.cnpj_cpf);
        formData.append('contactPhone', profileData.contact_phone);
        formData.append('email', profileData.email);
        formData.append('pix', profileData.pix);
        formData.append('fullAddress', profileData.full_address);
        formData.append('website', profileData.website);
        formData.append('inscricaoEstadual', profileData.inscricao_estadual);
        formData.append('inscricaoMunicipal', profileData.inscricao_municipal);
        formData.append('cep', profileData.cep);
        formData.append('enderecoRua', profileData.endereco_rua);
        formData.append('enderecoNumero', profileData.endereco_numero);
        formData.append('enderecoBairro', profileData.endereco_bairro);
        formData.append('enderecoCidade', profileData.endereco_cidade);
        formData.append('enderecoUf', profileData.endereco_uf);
        formData.append('corTema', profileData.cor_tema);
        if (logoFile) {
            formData.append('logo', logoFile);
        }


        // Validações
        if (profileData.email && !validateEmail(profileData.email)) {
            toast.error('Email inválido');
            setIsSaving(false);
            return;
        }
        
        if (profileData.cnpj_cpf && !validateCpfCnpj(profileData.cnpj_cpf)) {
            toast.error('CPF/CNPJ inválido');
            setIsSaving(false);
            return;
        }
        
        if (profileData.pix && !validatePix(profileData.pix)) {
            toast.error('Chave PIX inválida');
            setIsSaving(false);
            return;
        }

        try {
            const response = await axios.put(`${DATA_API_URL}/profile`, formData, {
                headers: { 
                    'x-auth-token': token,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("Perfil atualizado com sucesso!");
            // Atualiza a pré-visualização com o link final da S3 após o upload
            if (response.data.updatedProfile && response.data.updatedProfile.logo_url) {
                setLogoPreview(response.data.updatedProfile.logo_url);
            }
            setLogoFile(null); // Limpa o ficheiro após o upload
        } catch (error) {
            toast.error(error.response?.data?.error || "Erro ao salvar o perfil.");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className="card"><p>A carregar perfil...</p></div>;
    }

    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2>Perfil da Empresa</h2>
            </div>
            <p style={{color: 'var(--cor-texto-secundario)', marginBottom: '20px'}}>As informações preenchidas aqui aparecerão nos seus relatórios e documentos.</p>
            
            <form onSubmit={handleSubmit}>
                {/* Logo */}
                <div className="card" style={{marginBottom: '20px'}}>
                    <h3 style={{marginBottom: '15px'}}>Logo da Empresa</h3>
                    <div style={{ textAlign: 'center' }}>
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo da Empresa" style={{ width: '120px', height: '120px', borderRadius: '8px', objectFit: 'cover', border: '2px solid var(--cor-borda)' }} />
                        ) : (
                            <div style={{ width: '120px', height: '120px', borderRadius: '8px', backgroundColor: 'var(--cor-fundo)', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 'auto', border: '2px dashed var(--cor-borda)' }}>
                                <span style={{color: 'var(--cor-texto-secundario)'}}>Sem Logo</span>
                            </div>
                        )}
                        <div style={{margin: '15px 0'}}>
                             <label htmlFor="logo-upload" className="btn" style={{cursor: 'pointer', padding: '8px 16px', fontSize: '14px'}}>Alterar Logo</label>
                             <input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} style={{display: 'none'}}/>
                        </div>
                    </div>
                </div>

                {/* Informações Básicas */}
                <div className="card" style={{marginBottom: '20px'}}>
                    <h3 style={{marginBottom: '15px'}}>Informações Básicas</h3>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                        <div className="input-group">
                            <label>Nome da Empresa</label>
                            <input
                                type="text"
                                name="company_name"
                                value={profileData.company_name || ''}
                                onChange={handleInputChange}
                                placeholder="Razão social ou nome fantasia"
                            />
                        </div>
                        <div className="input-group">
                            <label>CNPJ / CPF</label>
                            <input
                                type="text"
                                name="cnpj_cpf"
                                value={profileData.cnpj_cpf || ''}
                                onChange={handleInputChange}
                                placeholder="00.000.000/0000-00"
                            />
                        </div>
                    </div>
                </div>

                {/* Contato */}
                <div className="card" style={{marginBottom: '20px'}}>
                    <h3 style={{marginBottom: '15px'}}>Informações de Contato</h3>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
                        <div className="input-group">
                            <label>Número do WhatsApp</label>
                            <input
                                type="text"
                                name="contact_phone"
                                value={profileData.contact_phone || ''}
                                onChange={handleInputChange}
                                placeholder="22989898989 (apenas números)"
                            />
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={profileData.email || ''}
                                onChange={handleInputChange}
                                placeholder="contato@empresa.com"
                            />
                        </div>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                        <div className="input-group">
                            <label>PIX</label>
                            <input
                                type="text"
                                name="pix"
                                value={profileData.pix || ''}
                                onChange={handleInputChange}
                                placeholder="Chave PIX (CPF, email, telefone...)"
                            />
                        </div>
                        <div className="input-group">
                            <label>Site / Instagram</label>
                            <input
                                type="text"
                                name="website"
                                value={profileData.website || ''}
                                onChange={handleInputChange}
                                placeholder="www.empresa.com ou @instagram"
                            />
                        </div>
                    </div>
                </div>

                {/* Endereço */}
                <div className="card" style={{marginBottom: '20px'}}>
                    <h3 style={{marginBottom: '15px'}}>Endereço</h3>
                    <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px'}}>
                        <div className="input-group">
                            <label>CEP</label>
                            <input
                                type="text"
                                name="cep"
                                value={profileData.cep || ''}
                                onChange={handleInputChange}
                                placeholder="00000-000"
                                maxLength="9"
                            />
                        </div>
                        <div className="input-group">
                            <label>UF</label>
                            <input
                                type="text"
                                name="endereco_uf"
                                value={profileData.endereco_uf || ''}
                                onChange={handleInputChange}
                                placeholder="SP"
                                maxLength="2"
                                style={{textTransform: 'uppercase'}}
                            />
                        </div>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '15px', marginBottom: '15px'}}>
                        <div className="input-group">
                            <label>Rua/Avenida</label>
                            <input
                                type="text"
                                name="endereco_rua"
                                value={profileData.endereco_rua || ''}
                                onChange={handleInputChange}
                                placeholder="Nome da rua ou avenida"
                            />
                        </div>
                        <div className="input-group">
                            <label>Número</label>
                            <input
                                type="text"
                                name="endereco_numero"
                                value={profileData.endereco_numero || ''}
                                onChange={handleInputChange}
                                placeholder="123"
                            />
                        </div>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                        <div className="input-group">
                            <label>Bairro</label>
                            <input
                                type="text"
                                name="endereco_bairro"
                                value={profileData.endereco_bairro || ''}
                                onChange={handleInputChange}
                                placeholder="Nome do bairro"
                            />
                        </div>
                        <div className="input-group">
                            <label>Cidade</label>
                            <input
                                type="text"
                                name="endereco_cidade"
                                value={profileData.endereco_cidade || ''}
                                onChange={handleInputChange}
                                placeholder="Nome da cidade"
                            />
                        </div>
                    </div>
                </div>

                {/* Personalização */}
                <div className="card" style={{marginBottom: '20px'}}>
                    <h3 style={{marginBottom: '15px'}}>Personalização</h3>
                    <div className="input-group" style={{maxWidth: '200px'}}>
                        <label>Cor do Tema</label>
                        <input
                            type="color"
                            name="cor_tema"
                            value={profileData.cor_tema || '#2c5aa0'}
                            onChange={handleInputChange}
                            style={{width: '60px', height: '40px', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
                        />
                    </div>
                </div>

                {/* Informações Fiscais */}
                <div className="card" style={{marginBottom: '20px'}}>
                    <h3 style={{marginBottom: '15px'}}>Informações Fiscais (Opcional)</h3>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                        <div className="input-group">
                            <label>Inscrição Estadual</label>
                            <input
                                type="text"
                                name="inscricao_estadual"
                                value={profileData.inscricao_estadual || ''}
                                onChange={handleInputChange}
                                placeholder="000.000.000.000"
                            />
                        </div>
                        <div className="input-group">
                            <label>Inscrição Municipal</label>
                            <input
                                type="text"
                                name="inscricao_municipal"
                                value={profileData.inscricao_municipal || ''}
                                onChange={handleInputChange}
                                placeholder="000000"
                            />
                        </div>
                    </div>
                </div>

                {/* Preview do Relatório */}
                <div className="card" style={{marginBottom: '20px'}}>
                    <h3 style={{marginBottom: '15px'}}>Preview do Relatório</h3>
                    <div style={{
                        border: '2px solid var(--cor-borda)',
                        borderRadius: '8px',
                        padding: '20px',
                        backgroundColor: 'white',
                        color: '#333'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            borderBottom: `3px solid ${profileData.cor_tema || '#2c5aa0'}`,
                            paddingBottom: '15px',
                            marginBottom: '20px'
                        }}>
                            <div>
                                <h2 style={{color: profileData.cor_tema || '#2c5aa0', margin: '0 0 5px 0', fontSize: '20px'}}>
                                    {profileData.company_name || 'Nome da Empresa'}
                                </h2>
                                {profileData.cnpj_cpf && profileData.cnpj_cpf.trim() && <div style={{fontSize: '12px', color: '#666'}}>CNPJ/CPF: {profileData.cnpj_cpf}</div>}
                                {(() => {
                                    const endereco = [];
                                    if (profileData.endereco_rua) endereco.push(profileData.endereco_rua);
                                    if (profileData.endereco_numero) endereco.push(profileData.endereco_numero);
                                    if (profileData.endereco_bairro) endereco.push(profileData.endereco_bairro);
                                    if (profileData.endereco_cidade) endereco.push(profileData.endereco_cidade);
                                    if (profileData.endereco_uf) endereco.push(profileData.endereco_uf);
                                    if (profileData.cep) endereco.push(`CEP: ${profileData.cep}`);
                                    const enderecoCompleto = endereco.join(', ');
                                    return enderecoCompleto && <div style={{fontSize: '12px', color: '#666'}}>{enderecoCompleto}</div>;
                                })()}
                                {profileData.contact_phone && profileData.contact_phone.trim() && <div style={{fontSize: '12px', color: '#666'}}>Tel: {profileData.contact_phone}</div>}
                                {profileData.email && profileData.email.trim() && <div style={{fontSize: '12px', color: '#666'}}>Email: {profileData.email}</div>}
                                {profileData.pix && profileData.pix.trim() && <div style={{fontSize: '12px', color: '#666'}}>PIX: {profileData.pix}</div>}
                            </div>
                            {logoPreview && (
                                <img src={logoPreview} alt="Logo" style={{width: '60px', height: '40px', objectFit: 'contain'}} />
                            )}
                        </div>
                        <div style={{textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end'}}>
                            <div style={{color: profileData.cor_tema || '#2c5aa0', fontWeight: 'bold'}}>RELATÓRIO DE FECHAMENTO</div>
                            <div style={{fontSize: '12px', color: '#666'}}>Nº REL-123456</div>
                            <div style={{fontSize: '12px', color: '#666'}}>Emitido em: {new Date().toLocaleDateString('pt-BR')}</div>
                            {qrCodeUrl && (
                                <div style={{marginTop: '10px'}}>
                                    <img src={qrCodeUrl} alt="QR Code" style={{width: '60px', height: '60px'}} />
                                </div>
                            )}
                        </div>
                    </div>
                    <p style={{fontSize: '12px', color: 'var(--cor-texto-secundario)', textAlign: 'center', marginTop: '10px'}}>
                        Este é um preview de como suas informações aparecerão no relatório
                    </p>
                </div>

                <div style={{textAlign: 'center'}}>
                    <button type="submit" className="btn" disabled={isSaving} style={{padding: '12px 30px'}}>
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ProfilePage;