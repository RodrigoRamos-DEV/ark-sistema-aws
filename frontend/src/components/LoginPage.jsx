import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API_URL from '../apiConfig'; 

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Redireciona se já estiver logado
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const user = JSON.parse(localStorage.getItem('user'));
            if (user?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/client-router');
            }
        }
    }, [navigate]);
    
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            
                        const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            if (response.data.user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/client-router');
            }
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Erro ao conectar ao servidor.');
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="card login-card">
                <h1>Sistemas ARK</h1>
                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Senha</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div style={{textAlign: 'right', marginBottom: '20px', fontSize: '0.9em'}}>
                        <Link to="/forgot-password">Esqueci a minha senha</Link>
                    </div>
                    <button type="submit" className="btn" disabled={isLoading}>{isLoading ? 'A entrar...' : 'Entrar'}</button>
                </form>
                <p style={{ marginTop: '20px' }}>Não tem uma conta? <Link to="/register">Criar Conta</Link></p>
            </div>
        </div>
    );
}

export default LoginPage;