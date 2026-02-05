# FilePriv
> **Um protótipo de sistema distribuído focado em segurança e criptografia.**

O **FilePriv** é uma solução acadêmica que eu desenvolvi durante a disciplina de desenvolvimento web do curso de CSTRC-JP do IFPB, com a orientação do professor Luiz Carlos. O sistema fragmenta, criptografa e distribui arquivos para múltiplas máquinas virtuais, garantindo privacidade e confidencialidade. 

---

## Funcionalidades
* **Gerenciamento de usuários:** Criação e autenticação segura.
* **Upload seguro:** Sharding (fragmentação) e criptografia AES-256 antes do envio.
* **Armazenamento distribuído:** Os pedaços dos arquivos são espalhados por diferentes VMs.
* **Download e reconstrução:** Recuperação e descriptografia automática dos arquivos.

---

## Pré-requisitos
Para executar este projeto, recomenda-se o uso de um ambiente **Linux** (preferencialmente base Debian/Ubuntu). Certifique-se de ter instalado:

* [VirtualBox](https://www.virtualbox.org/)
* [Vagrant](https://www.vagrantup.com/)
* [Docker](https://www.docker.com/) & Docker Compose
* [Node.js](https://nodejs.org/)
* [Rust](https://www.rust-lang.org/)

---

### 1. Infraestrutura (VMs e Banco de Dados)
Inicie as Máquinas Virtuais e o banco de dados PostgreSQL.

### 2. Backend (Node.js)
Instale as dependências e inicie a API principal dentro da pasta src/backend/

### 3. Services (Rust)
Inicie o serviço de criptografia e gerenciamento de shards dentro da pasta src/backend/services

### 4. Frontend
Sirva a aplicação web estática  na raiz do projeto 

--- 

## Diagrama
![Diagrama FilePriv](https://https://github.com/ryan-morais-rm/FilePriv/blob/main/filepriv.png)

---
## Contato
Dúvidas ou sugestões? Entre em contato:
* Email: ryan.morais.workspace@gmail.com
* LinkedIn: ryan-morais-rm
