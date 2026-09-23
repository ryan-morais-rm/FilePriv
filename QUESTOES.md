
# Backlog de Segurança e Arquitetura — FilePriv

Documento vivo. Cada item tem: a pergunta, o status atual da resposta, o que já existe (se algo), e a mitigação/próximo passo proposto. Atualizar conforme itens forem resolvidos.

**Legenda de status:**

- ✅ Respondido — implementado e documentável
- 🟡 Parcial — existe algo, mas não cobre a pergunta inteira
- ❌ Não respondido — sem implementação nem documentação hoje

---

## 1. Criptografia e gestão de segredos

### 1.1 Como você garante unicidade de nonce?

**Status:** ✅ Respondido (implementação existe, falta documentar)
`crypto.rs::cifrar_arquivo` gera o nonce (96 bits) via `OsRng`, o gerador criptográfico do sistema operacional, um novo por arquivo. Com 2^96 valores possíveis e uma chave nova a cada arquivo (AES-256-GCM é usado com chave efêmera por arquivo, não uma chave mestra reaproveitada), a probabilidade de colisão é desprezível na escala do projeto.
**Mitigação/próximo passo:** escrever um parágrafo específico no TCC explicando o mecanismo e justificando o espaço amostral — hoje a resposta existe no código, mas não em prosa defensável perante banca.

### 1.2 O que acontece se o S3 for comprometido?

**Status:** 🟡 Parcial
Hoje: se a AK/SK da AWS vazar, o atacante lê tanto as chaves de criptografia de arquivo quanto a credencial SSH — a separação entre os dois é lógica (prefixos diferentes no bucket), não criptográfica.
**Mitigação:** (a) parar de usar o fallback AK/SK em ambiente não-dev, usar IAM Role via IMDS exclusivamente (já suportado em `s3_keys.rs`); (b) política de bucket com prefixos segregados por IAM policy, não só por convenção de nomes; (c) evolução de mais rigor: envelope encryption com AWS KMS — a chave do arquivo seria cifrada por uma CMK do KMS antes de subir ao S3, então vazar só o S3 não bastaria sem também comprometer o KMS.

### 1.3 Como você faz rotação de chaves?

**Status:** ❌ Não respondido
Não há rotação de nada hoje: chave AES é de uso único (não rotaciona por design, cada arquivo tem a sua), mas a credencial SSH e o certificado TLS não têm nenhuma política de expiração/renovação.
**Mitigação:** definir política explícita — ex. credencial SSH rotacionada a cada N meses ou sob suspeita de exposição, endpoint administrativo para forçar rotação (gera nova chave, atualiza `authorized_keys` nas VMs, invalida a referência antiga no S3). Certificados TLS via Let's Encrypt (se exposto publicamente) ou CA interna com renovação automatizada.

### 1.4 Há autenticação mútua no gRPC (mTLS)?

**Status:** ❌ Não respondido
O TLS entre Node e Rust é unilateral — o Node valida o certificado do Rust, mas o Rust aceita qualquer chamador que alcance o endereço na rede.
**Mitigação:** configurar mTLS — emitir um certificado de cliente para o Node, e o Rust (`main.rs`, via `ServerTlsConfig`) passa a exigir e validar esse certificado antes de processar qualquer RPC.

---

## 2. Disponibilidade e confiabilidade

### 2.1 O que acontece se um nó de armazenamento cair?

**Status:** 🟡 Parcial — e é o gap mais sério do projeto hoje
O sistema **detecta** a queda (`healthcheck.rs` + `healthCheckScheduler.js`, a cada 5 min), mas não há fragmentação redundante: cada arquivo cifrado vai inteiro para **um único nó**, escolhido pelo critério de menor carga. Se aquele nó morre, o arquivo é perdido — não há réplica nem erasure coding.
**Mitigação:** dois caminhos possíveis, a avaliar no redesenho AWS: (a) replicação simples — gravar o blob em N nós em vez de 1; (b) erasure coding real (ex. Reed-Solomon), fragmentando de fato o arquivo em pedaços recuperáveis com perda parcial. Vale também alinhar terminologia no TCC: hoje o sistema faz *distribuição* de arquivos entre nós, não *fragmentação redundante* — são conceitos diferentes e a resposta honesta pra banca precisa refletir isso.

### 2.2 O que acontece se o Postgres for perdido ou corrompido?

**Status:** ❌ Não respondido (pergunta nova)
Sem o Postgres, os blobs cifrados nas VMs e as chaves no S3 continuam existindo fisicamente, mas ficam **irrecuperáveis** — não há como saber qual UUID de blob corresponde a qual usuário/arquivo, nem qual referência de chave no S3 corresponde a qual blob. O Postgres é hoje o único elo entre as três partes do sistema.
**Mitigação:** política de backup (dump periódico, `pg_dump` agendado, ou usar backup automatizado se migrar pra RDS na AWS) e um runbook de disaster recovery documentado, mesmo que simples.

### 2.3 Existe rate limiting ou proteção contra força bruta no login?

**Status:** ❌ Não respondido (pergunta nova)
`authController.loginUser` e `adminController.login` não têm nenhum limite de tentativas — um script pode tentar senhas indefinidamente contra qualquer endpoint de login.
**Mitigação:** middleware de rate limiting (ex. `express-rate-limit`) por IP e/ou por conta, com backoff progressivo; considerar bloqueio temporário após N tentativas falhas, especialmente no login de admin.

### 2.4 Como é feita a revogação de sessão (JWT)?

**Status:** ❌ Não respondido (pergunta nova)
Tokens JWT (usuário: 8h, admin: 2h) não têm mecanismo de revogação — se um token vazar, ele continua válido até expirar naturalmente, mesmo que a senha seja trocada ou o usuário seja removido.
**Mitigação:** lista de revogação (denylist) em cache (Redis, por exemplo) checada no middleware, ou reduzir o tempo de expiração e usar refresh tokens com rotação.

---

## 3. Governança, auditoria e acesso administrativo

### 3.1 O admin tem MFA? Auditoria?

**Status:** ❌ Não respondido
Login é usuário/senha fixos vindos do `.env`, sem segundo fator. Nenhuma ação administrativa (popular sub-rede, trocar config de rede) é registrada de forma auditável — hoje só existe `console.log`, que não é auditoria de verdade (não é imutável, não é estruturado por quem/quando/o quê, e some se o container reiniciar sem volume de log persistente).
**Mitigação:** (a) MFA no login admin (TOTP, por exemplo); (b) tabela de auditoria no Postgres (ou serviço externo tipo CloudTrail se migrar pra AWS) registrando toda ação administrativa com timestamp, ator e payload relevante.

### 3.2 Como é tratada a exclusão de conta (LGPD / direito ao esquecimento)?

**Status:** ❌ Não respondido (pergunta nova, mas já sinalizada antes como gap)
Não existe rota de "excluir conta" hoje (confirmado anteriormente no backlog geral). Além disso, `Usuario → Arquivo` tem `onDelete: Cascade` no Prisma — se um usuário for deletado diretamente no banco, os registros de `Arquivo` somem, mas os blobs cifrados nas VMs e as chaves no S3 ficam **órfãos**, nunca de fato apagados.
**Mitigação:** implementar rota de exclusão de conta que primeiro dispara `excluirArquivo` no Rust para cada arquivo do usuário (reaproveitando o fluxo de delete já existente) e só então remove o registro do usuário — documentar isso como requisito de conformidade, não só como funcionalidade.

### 3.3 Existe modelagem de ameaças (threat model) documentada?

**Status:** ❌ Não respondido
Discussões de ameaça aconteceram de forma informal ao longo do desenvolvimento (ex. exposição da chave SSH, S3 como ponto único de falha), mas nunca foram consolidadas como artefato.
**Mitigação:** documento de threat model (mesmo que simplificado, tipo STRIDE) listando atores de ameaça, superfícies de ataque e mitigações — vira também material de defesa direto.

---

## 4. Métricas, desempenho e custo

### 4.1 Quais são as métricas de segurança e desempenho do sistema?

**Status:** ❌ Não respondido
Não há benchmark de latência de upload/download, nem métrica de "tempo médio de detecção de nó caído", nem nada que quantifique as afirmações do README sobre segurança/robustez.
**Mitigação:** rodar e documentar benchmarks básicos (tempo de upload/download por tamanho de arquivo, overhead da cifragem AES-GCM, tempo médio entre queda real de um nó e detecção pelo healthcheck).

### 4.2 Qual o custo de latência introduzido pela arquitetura (cifragem, S3, SFTP, múltiplos saltos)?

**Status:** ❌ Não respondido
Cada upload hoje envolve: Node → Rust (gRPC) → cifragem → gravação da chave no S3 → envio SFTP pra VM. Cada elo soma latência, mas nunca foi medido nem decomposto.
**Mitigação:** instrumentar `grpc.rs` com timestamps por etapa (cifragem, chamada S3, chamada SFTP) e reportar isso nos logs ou numa métrica exportável — dá pra responder com números reais em vez de estimativa.

### 4.3 Qual o modelo de custo se migrar para infraestrutura AWS real?

**Status:** ❌ Não respondido (pergunta nova, relevante para o redesenho futuro)
Hoje os "nós de armazenamento" são VMs quaisquer acessadas por SSH — não há noção de custo por request S3, transferência de dados, ou instâncias EC2/auto scaling.
**Mitigação:** fica para quando você arquitetar a versão AWS — mapear custo por componente (S3 requests + storage, EC2 dos nós, possível RDS pro Postgres, transferência entre AZs) antes de desenhar o auto scaling, já que redundância (item 2.1) e rotação via KMS (item 1.3) tendem a sair mais baratos resolvidos nesse redesenho do que como patch na arquitetura atual.

---

## 5. Rigor de engenharia

### 5.1 Existem testes automatizados?

**Status:** ❌ Não respondido
Zero cobertura de teste, tanto no Node quanto no Rust.
**Mitigação:** começar pelo mais crítico — testes unitários em `crypto.rs` (cifrar/decifrar, validação de tamanho de chave/nonce) e nos validadores do Node (magic bytes, categoria válida por perfil), que são funções puras e baratas de testar.

### 5.2 Existe CI/CD?

**Status:** ❌ Não respondido
Nenhum pipeline (GitHub Actions ou similar) configurado.
**Mitigação:** pipeline mínimo — lint + build do Node e do Rust a cada push, rodando os testes do item 5.1 quando existirem.

### 5.3 Existe análise estática (SAST) ou verificação de dependências vulneráveis?

**Status:** ❌ Não respondido (pergunta nova)
Nenhuma ferramenta de análise estática rodando, nem checagem de CVEs conhecidas nas dependências (`npm audit`, `cargo audit`).
**Mitigação:** rodar `npm audit` e `cargo audit` periodicamente (ou no CI, junto do item 5.2) — baixo esforço, alto retorno de credibilidade numa defesa.

### 5.4 Existe alguma prova de conceito de ataque mitigado?

**Status:** ❌ Não respondido
Nenhuma demonstração prática (mesmo que em ambiente controlado) de um ataque que a arquitetura efetivamente barra.
**Mitigação:** escolher 1-2 cenários simples de demonstrar (ex. interceptar tráfego gRPC sem TLS vs. com TLS habilitado; tentar ler um blob cifrado sem a chave do S3) — é isso que transforma "dissemos que é seguro" em "mostramos que é seguro" perante a banca.

---

## 6. Perguntas gerais de enquadramento (para abrir/fechar a defesa)

### 6.1 Como você avalia que o sistema é seguro, no geral?

**Status:** 🟡 Parcial
Hoje a resposta honesta é: "seguro contra alguns vetores específicos (interceptação de conteúdo em trânsito e em repouso via cifragem + TLS), mas com gaps conhecidos e documentados (itens acima)". Isso é uma resposta academicamente defensável — melhor que alegar segurança total.
**Mitigação:** consolidar esse raciocínio como uma seção explícita de "Limitações conhecidas" no README/TCC, referenciando este backlog. Isso é, paradoxalmente, o que dá mais rigor ao trabalho — reconhecer os limites é melhor recebido por uma banca técnica do que alegações vagas de "sistema seguro".

---

## Como usar este documento

- Ao resolver um item, mude o status para ✅ e mova a explicação de "Mitigação" para "O que existe hoje".
- Itens novos que surgirem durante o redesenho AWS (auto scaling, multi-AZ, etc.) devem ser adicionados nas seções 2 (disponibilidade) e 4 (custo), já que a maior parte dos gaps de redundância e rotação tende a ser resolvida naturalmente nesse redesenho.
