CREATE DATABASE filepriv_db;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
);

CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,         
    nome_original VARCHAR(255),          
    descricao TEXT,
    tamanho BIGINT,                         
    is_encrypted BOOLEAN DEFAULT FALSE,  
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);