import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import API_URL from '../apiConfig';

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            // ANTES: const response = await axios.post('http://localhost:3000/api/auth/forgot-password', { email });
            const response = await axios.post(`${API_URL}/api/auth/forgot-password`, { email }); // <-- ALTERADO
            
            toast.success(response.data.msg);
            setMessage(response.data.msg);
        } catch (error) {
            toast.error("Ocorreu um erro. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="card login-card">
                <h2>Recuperar Senha</h2>
                <p>Insira o seu e-mail para receber um link de redefinição.</p>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'A enviar...' : 'Enviar Link'}
                    </button>
                    {message && <p style={{color: 'var(--cor-sucesso)', marginTop: '15px'}}>{message}</p>}
                </form>
                <p style={{ marginTop: '20px' }}><Link to="/">Voltar para o Login</Link></p>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;