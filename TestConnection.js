const pool = require('./db'); // Certifique-se de que o caminho para 'db.js' está correto

async function testConnection() {
    try {
        const res = await pool.query('SELECT NOW()'); // Realiza uma consulta simples para pegar a data/hora atual do banco
        console.log('Conexão bem-sucedida!', res.rows[0]); // Exibe o resultado da consulta
    } catch (err) {
        console.error('Erro ao conectar ao banco:', err); // Exibe qualquer erro de conexão
    } finally {
        pool.end(); // Fecha o pool de conexões
    }
}

testConnection();
