# FilePriv

> **Um protótipo de sistema distribuído focado em segurança e criptografia.**

O **FilePriv** é uma solução acadêmica desenvolvida durante a disciplina de desenvolvimento web do curso de CSTRC-JP do IFPB, sob orientação do professor Luiz Carlos. O sistema fragmenta, criptografa e distribui arquivos entre múltiplas máquinas virtuais, garantindo privacidade e confidencialidade dos dados armazenados.

---

## Arquitetura

O projeto é dividido em três camadas, cada uma com uma responsabilidade isolada:

| Camada                  | Responsabilidade                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Node.js (API)** | Autenticação, metadados (Postgres via Prisma), orquestração do fluxo de upload/download/exclusão, painel administrativo.                    |
| **Rust (gRPC)**   | Cifragem AES-256-GCM, particionamento, envio/recuperação dos blocos via SFTP nas VMs de armazenamento, verificação de saúde dos servidores. |
| **Postgres**      | Metadados de usuários, arquivos, servidores e configuração de rede. Nunca armazena o conteúdo dos arquivos nem chaves de criptografia.       |

O Node **nunca** grava arquivos fisicamente — ele delega essa responsabilidade inteiramente ao serviço Rust, comunicando-se por gRPC sobre TLS. Essa separação de responsabilidades é intencional e mantida em toda evolução do projeto: o Rust não tem conhecimento de conceitos de negócio do Node (como perfil de usuário ou categoria de arquivo), e o Node não lida diretamente com criptografia ou SSH.

```
Usuário → Node.js (API/Auth) → gRPC/TLS → Rust (cifra + particiona)
                                              ↓ SFTP
                                        VMs de armazenamento
                                              ↓
                                       Amazon S3 (chaves)
```

---

## Segurança

- **Criptografia por arquivo:** cada upload é cifrado com **AES-256-GCM**, com uma chave e um nonce únicos gerados no momento do envio.
- **Separação entre payload e segredo:** o blob cifrado vai para uma VM de armazenamento via SFTP; a chave de criptografia correspondente vai para um bucket S3 separado, referenciada por um UUID. Comprometer um lado não expõe o outro.
- **Credencial SSH também no cofre:** a chave privada usada pelo Rust para autenticar nas VMs de armazenamento é enviada **uma única vez** (pelo painel admin) e armazenada no S3, da mesma forma que as chaves de criptografia de arquivo. O Postgres e as chamadas gRPC subsequentes carregam apenas uma referência, nunca o valor em texto puro.
- **TLS de ponta a ponta:** o Node conversa com o Rust por gRPC com TLS (certificado próprio), e o Node expõe sua própria API por HTTPS.
- **Validação de arquivo por conteúdo:** o Node confere os *magic bytes* do arquivo recebido, não confiando apenas na extensão informada.
- **Autenticação em duas camadas:** usuários comuns (JWT) e administração de infraestrutura (JWT separado, sem relação com a tabela de usuários).

---

## Funcionalidades

- **Gerenciamento de usuários:** cadastro e autenticação seguros (bcrypt + JWT), com escolha de um **perfil de uso** no cadastro (Estudante, Advogado, Concurseiro, entre outros — veja [Perfis e categorias](#perfis-de-usuário-e-categorias-de-arquivo)).
- **Upload seguro:** cifragem e particionamento automáticos antes do envio, com escolha do servidor de armazenamento menos carregado no momento.
- **Armazenamento distribuído:** os arquivos são espalhados por diferentes VMs, cadastradas e monitoradas pelo painel administrativo.
- **Download e reconstrução:** recuperação e descriptografia automática, com streaming direto do Rust para o cliente.
- **Organização por categoria:** cada arquivo é rotulado com uma categoria sugerida de acordo com o perfil do usuário (ex.: um Advogado vê "Processos", "Contratos"; um Estudante vê "Provas", "Trabalhos"), usada para filtrar e visualizar a lista de arquivos. É um atributo de organização — não gera pastas físicas nem é conhecida pelo Rust.
- **Painel administrativo:** login separado, varredura de sub-rede (CIDR /24) para descoberta automática de servidores via SSH, e verificação de saúde recorrente (a cada 5 minutos) que confirma se cada servidor ainda responde e tem permissão de escrita.

---

## Perfis de usuário e categorias de arquivo

No cadastro, o usuário escolhe um dos 10 perfis disponíveis. Cada perfil vem com um conjunto de categorias de arquivo sugeridas, sempre com "Outros" disponível como opção coringa:

| Perfil                        | Categorias sugeridas                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| Estudante                     | Provas, Trabalhos, Apostilas, Certificados                           |
| Concurseiro(a)                | Editais, Simulados, Material de Estudo, Cronogramas                  |
| Advogado(a)                   | Processos, Contratos, Petições, Pareceres                          |
| Contador(a)                   | Notas Fiscais, Balanços, Declarações, Contratos                   |
| Desenvolvedor(a) / TI         | Documentação Técnica, Backups de Projeto, Certificados, Contratos |
| Profissional de Saúde        | Prontuários, Exames, Laudos, Certificados                           |
| Designer / Criativo           | Portfólio, Briefings, Contratos, Referências                       |
| Empresário(a) / Autônomo(a) | Contratos, Notas Fiscais, Propostas, Certidões                      |
| Servidor(a) Público(a)       | Ofícios, Processos Administrativos, Editais, Certidões             |
| Uso Pessoal / Outros          | Documentos Pessoais, Fotos, Certificados, Diversos                   |

O usuário pode trocar de perfil a qualquer momento pelo painel principal. Ao trocar, arquivos cuja categoria não existe mais no novo perfil são automaticamente movidos para uma categoria especial **"Migração"**, preservando o histórico sem perder nenhum arquivo — a reorganização fica a cargo do usuário depois.

---

## Pré-requisitos

* [Docker](https://www.docker.com/) & Docker Compose
* [OpenSSL](https://www.openssl.org/) (para gerar os certificados TLS locais)
* Uma conta AWS com um bucket S3 dedicado (para chaves de criptografia e credencial SSH)
* Uma ou mais VMs acessíveis via SSH para servir como nós de armazenamento (para testes locais, [Vagrant](https://www.vagrantup.com/) + [VirtualBox](https://www.virtualbox.org/) são suficientes)
* [Node.js](https://nodejs.org/) e [Rust](https://www.rust-lang.org/) — apenas se for rodar algum dos serviços fora do Docker

---

## Configuração e execução

### 1. Clone o repositório

```bash
git clone https://github.com/ryan-morais-rm/FilePriv.git
cd FilePriv
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (consulte `_env` como referência) com:

```
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/filepriv_db?schema=public"
JWT_SECRET=<uma string aleatória e longa>

ADMIN_USERNAME=<usuário do painel admin>
ADMIN_PASSWORD=<senha do painel admin>

AWS_S3_BUCKET=<nome do seu bucket>
AWS_S3_REGION=<região do bucket>
AWS_ACCESS_KEY_ID=<sua access key>
AWS_SECRET_ACCESS_KEY=<sua secret key>
```

### 3. Gere os certificados TLS

**a) Certificado HTTPS do Node (auto-assinado):**

```bash
mkdir -p src/node/https_pem/
openssl req -nodes -new -x509 -keyout src/node/https_pem/key.pem -out src/node/https_pem/cert.pem -days 365 -subj "/CN=localhost"
```

**b) Certificado TLS do serviço gRPC (Rust):**

```bash
mkdir -p certs/rust-grpc/
openssl req -nodes -new -x509 -keyout certs/rust-grpc/server.key -out certs/rust-grpc/server.crt -days 365 -subj "/CN=localhost"
```

### 4. Suba os serviços

```bash
docker compose up -d
```

ou, usando os atalhos do `Makefile`:

```bash
make up       # sobe os containers existentes
make build    # builda as imagens e sobe
```

O container `node-api` já executa `npx prisma db push` automaticamente antes de iniciar a API — não é necessário rodar migrações manualmente.

### 5. Acesse a aplicação

- Aplicação: `https://localhost` (porta 443)
- Painel administrativo: `https://localhost/admin.html`, com as credenciais definidas em `ADMIN_USERNAME`/`ADMIN_PASSWORD`

### 6. Primeiro acesso ao painel admin

Após o login, cadastre a configuração de rede em **Popular Servidores**: sub-rede (CIDR /24), usuário SSH, diretório remoto e a chave privada SSH das VMs de armazenamento. A chave é enviada uma única vez e passa a ser referenciada a partir do S3 — veja [Segurança](#segurança).

---

## Comandos úteis (Makefile)

| Comando               | O que faz                              |
| --------------------- | -------------------------------------- |
| `make up`           | Sobe os containers existentes          |
| `make build`        | Builda as imagens e sobe os containers |
| `make down`         | Derruba os containers                  |
| `make logs`         | Acompanha os logs em tempo real        |
| `make ps`           | Lista o status dos containers          |
| `make clean`        | Derruba tudo, remove volumes e imagens |
| `make rebuild-hard` | Rebuild sem cache e sobe novamente     |
| `make restart`      | `down` seguido de `build`          |

---

## Autor

**Ryan de Morais Correia** — Estudante de CSTRC-JP, IFPB.
Projeto acadêmico, sob orientação do professor Luiz Carlos.

## Diagrama

![Diagrama FilePriv](https://github.com/ryan-morais-rm/FilePriv/blob/main/assets/filepriv.png)

---

## Contato

Dúvidas ou sugestões? Entre em contato:

* Email: ryan.morais.workspace@gmail.com
* LinkedIn: ryan-morais-rm
