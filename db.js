const pgp = require('pg-promise')();

const db = pgp({
    host: 'localhost',        // Endereço do servidor PostgreSQL
    port: 5432,               // Porta padrão do PostgreSQL
    database: 'seu_banco',    // Nome do seu banco de dados
    user: 'seu_usuario',      // Usuário do banco
    password: 'sua_senha'     // Senha do banco
});

module.exports = db;
