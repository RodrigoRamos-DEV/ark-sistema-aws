const bcrypt = require('bcryptjs');

const password = 'admin123'; // A senha que queremos criptografar

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log('--- Copie o hash abaixo ---');
console.log(hash);
console.log('--------------------------');