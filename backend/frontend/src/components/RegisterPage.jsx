import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import API_URL from '../apiConfig'; // <-- ADICIONADO

function RegisterPage() {
    const [formData, setFormData] = useState({
        companyName: '',
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // ANTES: const response = await axios.post('http://localhost:3000/api/auth/register', formData);
            const response = await axios.post(`${API_URL}/api/auth/register`, formData);
            
            toast.success(response.data.msg);
            if (response.data.whatsapp) {
                toast.info(`Para renovar após o trial, entre em contato: ${response.data.whatsapp}`, {
                    autoClose: 8000
                });
            }
            navigate('/'); // Redireciona para o login após o sucesso
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Erro ao efetuar o registo.');
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="card login-card">
                <h1>Criar Conta - Trial Gratuito</h1>
                <div style={{ background: '#e8f5e8', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                    <h3 style={{ color: '#2d5a2d', margin: '0 0 10px 0' }}>🎉 3 Dias Grátis!</h3>
                    <p style={{ color: '#2d5a2d', margin: '0', fontSize: '14px' }}>Teste todas as funcionalidades sem compromisso</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Nome da Empresa</label>
                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} required placeholder="Digite o nome da sua empresa" />
                    </div>
                    <div className="input-group">
                        <label>Seu Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="seu@email.com" />
                    </div>
                    <div className="input-group">
                        <label>Sua Senha</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength="6" placeholder="Mínimo 6 caracteres" />
                    </div>
                    <button type="submit" className="btn" disabled={isLoading} style={{ background: '#28a745', borderColor: '#28a745' }}>
                        {isLoading ? 'Criando conta...' : 'Começar Trial Gratuito'}
                    </button>
                </form>
                <p style={{ marginTop: '20px' }}>Já tem uma conta? <Link to="/">Faça o login</Link></p>
            </div>
        </div>
    );
}

export default RegisterPage;