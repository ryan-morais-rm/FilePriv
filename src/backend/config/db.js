import pg from 'pg'; 
import dotenv from 'dotenv'; 

dotenv.config();

const { Pool } = pg; 

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error('Erro ao conectar no PostgreSQL:', err.stack);
    }
    console.log('✅ Conectado ao PostgreSQL com sucesso!');
    release();
});

export default {
    query: (text, params) => pool.query(text, params),
};