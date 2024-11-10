const { Pool } = require('pg');

// Configuração do pool de conexões para o banco local
const pool = new Pool({
    user: 'postgres',        // Usuário do PostgreSQL
    host: 'localhost',       // Conexão local
    database: 'maes',        // Nome do banco de dados
    password: 'postgres',    // Senha do usuário
    port: 5433               // Porta padrão do PostgreSQL
});

module.exports = pool;
