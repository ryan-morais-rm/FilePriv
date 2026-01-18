#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS arquivos (
        id SERIAL PRIMARY KEY,
        nome_arquivo VARCHAR(255) NOT NULL,
        descricao VARCHAR(255) NOT NULL,
        caminho VARCHAR(255) NOT NULL,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE, 
        data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
EOSQL