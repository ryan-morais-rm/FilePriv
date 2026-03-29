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
## 1. Clone o repositório
* git clone https://github.com/SEU_USUARIO/FilePriv.git
* cd FilePriv

## 2. Instale as dependências do Manager (Node.js) na pasta raiz
* npm install

## 3. Crie um arquivo .env dentro de src/node/ 
* Consulte o .env.example

## 4. Crie um arquivo .env dentro de src/rust/
* Consulte o .env.example

## 5. Gere os certificados autoassinados
* mkdir -p src/node/https_pem/
* openssl req -nodes -new -x509 -keyout src/node/https_pem/key.pem -out src/node/https_pem/cert.pem -days 365 -subj "/CN=localhost"

## 6. Subir o banco de dados e o prisma
* docker compose up -d
* npx prisma generate
* npx prisma db push

## 7. Inicie o serviço
* sudo node src/node/app.js

--- 

## Diagrama
![Diagrama FilePriv](https://github.com/ryan-morais-rm/FilePriv/blob/main/assets/filepriv.png)

---
## Contato
Dúvidas ou sugestões? Entre em contato:
* Email: ryan.morais.workspace@gmail.com
* LinkedIn: ryan-morais-rm
