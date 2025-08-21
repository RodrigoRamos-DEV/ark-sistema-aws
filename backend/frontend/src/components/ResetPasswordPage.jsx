import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API_URL from '../apiConfig'; // <-- ADICIONADO

function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { token } = useParams(); // Pega o token da URL
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return toast.error("As senhas não coincidem.");
        }
        if (password.length < 6) {
            return toast.error("A senha deve ter no mínimo 6 caracteres.");
        }
        setIsLoading(true);
        try {
            // ANTES: const response = await axios.post(`http://localhost:3000/api/auth/reset-password/${token}`, { password });
            const response = await axios.post(`${API_URL}/api/auth/reset-password/${token}`, { password }); // <-- ALTERADO
            
            toast.success(response.data.msg);
            navigate('/');
        } catch (error) {
            toast.error(error.response?.data?.msg || "Ocorreu um erro.");
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="card login-card">
                <h2>Definir Nova Senha</h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Nova Senha</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>Confirmar Nova Senha</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'A salvar...' : 'Salvar Nova Senha'}
                    </button>
                </form>
                 <p style={{ marginTop: '20px' }}><Link to="/">Voltar para o Login</Link></p>
            </div>
        </div>
    );
}

export default ResetPasswordPage;