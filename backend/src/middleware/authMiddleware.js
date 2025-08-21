const jwt = require('jsonwebtoken');

// Este é o nosso "segurança"
module.exports = function (req, res, next) {
  // 1. Ele procura a "chave" (token) no cabeçalho da requisição
  const token = req.header('x-auth-token');

  // 2. Se não houver chave, ele barra a entrada
  if (!token) {
    return res.status(401).json({ msg: 'Acesso negado. Nenhum token fornecido.' });
  }

  try {
    // 3. Ele verifica se a chave é válida e não foi falsificada
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Se a chave for válida, ele anexa as informações do usuário à requisição
    req.user = decoded.user;

    // 5. Libera a passagem para o próximo destino
    next();
  } catch (err) {
    // 6. Se a chave for inválida ou expirada, ele barra a entrada
    res.status(401).json({ msg: 'Token inválido.' });
  }
};