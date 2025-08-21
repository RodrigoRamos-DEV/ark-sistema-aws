const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);
  try {
    const userResult = await db.query(
        'SELECT u.*, c.company_name, c.license_expires_at, c.license_status, COALESCE(c.client_type, \'produtor\') as client_type FROM users u LEFT JOIN clients c ON u.client_id = c.id WHERE u.email = $1',
        [email]
    );

    if (userResult.rows.length === 0) {
      console.log('User not found:', email);
      return res.status(400).json({ msg: 'Email ou senha inválidos.' });
    }

    const user = userResult.rows[0];

    if (user.role === 'funcionario' && user.license_expires_at) {
        const today = new Date();
        const expiryDate = new Date(user.license_expires_at);
        today.setHours(0, 0, 0, 0);
        const timeDiff = expiryDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let newStatus = 'Ativo';
        if (user.license_status === 'Trial') {
            if (daysLeft < 0) { newStatus = 'Trial Expirado'; }
            else { newStatus = 'Trial'; }
        } else {
            if (daysLeft < 0) { newStatus = 'Vencido'; } 
            else if (daysLeft <= 5) { newStatus = 'A Vencer'; }
        }
        
        if (newStatus !== user.license_status) {
            await db.query('UPDATE clients SET license_status = $1 WHERE id = $2', [newStatus, user.client_id]);
            user.license_status = newStatus;
        }
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(400).json({ msg: 'Email ou senha inválidos.' });
    }
    
    console.log('Login successful for:', email);
    
    const payload = {
        user: {
            id: user.id,
            clientId: user.client_id,
            role: user.role,
            clientType: user.client_type
        }
    };
    if (user.role === 'funcionario') {
        payload.user.companyName = user.company_name;
        payload.user.licenseExpiresAt = user.license_expires_at;
        payload.user.licenseStatus = user.license_status;
        
        // Calcular dias restantes para trial/licença
        if (user.license_expires_at) {
            const today = new Date();
            const expiryDate = new Date(user.license_expires_at);
            today.setHours(0, 0, 0, 0);
            const timeDiff = expiryDate.getTime() - today.getTime();
            payload.user.daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '8h' },
      (err, token) => {
        if (err) {
          console.error('JWT sign error:', err);
          throw err;
        }
        console.log('Sending response with token');
        res.json({ token, user: payload.user });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro no servidor.');
  }
};

exports.registerClient = async (req, res) => {
    const { email, password, companyName } = req.body;
    if (!email || !password || !companyName) {
        return res.status(400).json({ msg: "Por favor, preencha todos os campos." });
    }
    
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        
        // Verificar se email já existe
        const existingUser = await client.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (existingUser.rowCount > 0) {
            throw new Error("Este email já está em uso.");
        }
        
        // Criar cliente com trial de 3 dias
        const trialExpiry = new Date();
        trialExpiry.setDate(trialExpiry.getDate() + 3);
        
        const clientResult = await client.query(
            'INSERT INTO clients (company_name, client_type, license_expires_at, license_status) VALUES ($1, $2, $3, $4) RETURNING id',
            [companyName, 'produtor', trialExpiry, 'Trial']
        );
        
        const clientId = clientResult.rows[0].id;
        
        // Criar usuário
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        await client.query(
            'INSERT INTO users (client_id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
            [clientId, email, passwordHash, 'funcionario']
        );
        
        await client.query('COMMIT');
        
        res.status(201).json({ 
            msg: "Conta criada com sucesso! Você tem 3 dias de trial gratuito.",
            trialDays: 3,
            whatsapp: "+55 21 97304-4415" // SUBSTITUA PELO SEU NÚMERO REAL
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        if (err.code === '23505') { 
            return res.status(400).json({ msg: 'Este email já está em uso.' }); 
        }
        res.status(400).json({ msg: err.message || 'Erro no servidor.' });
    } finally {
        client.release();
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.json({ msg: "Se um utilizador com este e-mail existir, um link de redefinição de senha foi enviado." });
        }
        const user = userResult.rows[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const passwordResetExpires = new Date(Date.now() + 3600000);
        await db.query( 'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3', [passwordResetToken, passwordResetExpires, user.id] );
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const message = `<h1>Você solicitou uma redefinição de senha</h1><p>Por favor, clique neste <a href="${resetUrl}">link</a> para definir uma nova senha.</p><p>Este link expirará em 1 hora.</p>`;
        const transporter = nodemailer.createTransport({ host: process.env.EMAIL_HOST, port: process.env.EMAIL_PORT, secure: false, auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS, }, });
        await transporter.sendMail({ from: `"Sistemas ARK" <${process.env.EMAIL_USER}>`, to: user.email, subject: 'Redefinição de Senha - Sistemas ARK', html: message, });
        res.json({ msg: "Se um utilizador com este e-mail existir, um link de redefinição de senha foi enviado." });
    } catch (err) {
        await db.query('UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE email = $1', [req.body.email]);
        console.error("Erro no forgotPassword:", err.message);
        res.status(500).send('Erro no servidor ao tentar enviar o e-mail de redefinição.');
    }
};

exports.resetPassword = async (req, res) => {
    const { password } = req.body;
    const { token } = req.params;
    try {
        const passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
        const userResult = await db.query( 'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()', [passwordResetToken] );
        if (userResult.rows.length === 0) { return res.status(400).json({ msg: "Token inválido ou expirado." }); }
        const user = userResult.rows[0];
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await db.query( 'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2', [passwordHash, user.id] );
        res.json({ msg: "Senha redefinida com sucesso! Pode agora fazer o login." });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Erro no servidor.');
    }
};