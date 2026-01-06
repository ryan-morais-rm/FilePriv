-- (Opcional) Derruba o banco se já existir para recriar do zero (Cuidado em produção!)
-- DROP DATABASE IF EXISTS filepriv_db;

CREATE DATABASE filepriv_db;

-- 1. Tabela de Usuários
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    state VARCHAR(50),
    phone VARCHAR(20),
    institution VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Arquivos (Unificada com os novos campos)
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,          -- Nome salvo no sistema (pode ser hash)
    original_name VARCHAR(255),          -- Nome original do arquivo (ex: relatorio.pdf)
    description TEXT,
    size BIGINT,                         -- Tamanho em bytes
    is_encrypted BOOLEAN DEFAULT FALSE,  -- Status da criptografia
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Tabela de Nós (Servidores Virtualizados)
CREATE TABLE server_nodes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,    -- Ex: 'NODE-01' (Único para referenciar)
    ip VARCHAR(20) NOT NULL,
    port INTEGER NOT NULL,
    cpu_cores INTEGER,
    ram_gb INTEGER,
    disk_total VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Online'
);

-- 4. Tabela de Fragmentos (Shards) - Liga Arquivos aos Nós
CREATE TABLE file_shards (
    id SERIAL PRIMARY KEY,
    file_id INTEGER REFERENCES files(id) ON DELETE CASCADE, -- Se apagar o arquivo, apaga os shards
    node_id VARCHAR(50) NOT NULL,       -- Referência ao 'name' do server_node (ex: 'NODE-01')
    path TEXT NOT NULL,                 -- Caminho físico dentro da VM
    shard_index INTEGER NOT NULL,       -- Ordem do pedaço (0, 1, 2...)
    status VARCHAR(20) DEFAULT 'active'
);