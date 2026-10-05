# Meta:
### -> Deploy na nuvem

### Deploy
-> A aplicação precisa estar containerizada. 
-> Código Terraform
-> Código Ansible que configura o manager e os nodes. 
-> Código terraform que faz a configuração de load balancer, SGs, ACLs...


BACKLOG

Integrações reais com provedores externos (hoje só existe o mock visual)
- AWS S3 como destino de armazenamento escolhido pelo usuário: schema novo
  (credenciais do usuário, criptografadas em repouso), rota no Node, chamada
  real à AWS SDK
- Google Drive como destino opcional: decidir o mecanismo real de integração
  (provavelmente OAuth de verdade) e então implementar — hoje é só um botão
  que simula conexão com setTimeout

Backlog — Perfis de usuário + categoria de arquivo

T1 — Schema Prisma

enum CategoriaUsuario com as 10 opções, campo Usuario.categoria_perfil.
Arquivo ganha categoria String? (não enum fixo no banco — as opções válidas dependem do perfil do usuário + "Outros" + "Migração", então validação fica na aplicação, não no schema).

T2 — Cadastro (authController/authModel)

createUser passa a exigir categoria_perfil no corpo.
Endpoint (ou constante compartilhada) que devolve a lista de categorias possíveis pro seletor do formulário de cadastro.

T3 — Upload (fileController/fileModel)

uploadFile aceita categoria no corpo.
Validação: a categoria enviada precisa estar entre as sugeridas pro perfil do usuário, ou ser "Outros". Fora disso, rejeita.
Endpoint que devolve as categorias válidas pro usuário logado (baseado no categoria_perfil dele), pra alimentar o seletor no upload.

T4 — Troca de perfil do usuário

Rota nova (ou ajuste em updateProfile) pra trocar categoria_perfil.
Ao trocar, todo Arquivo desse usuário com categoria fora da nova lista válida vira "Migração" automaticamente (update em massa).

T5 — Listagem/filtro por categoria

listarPorUsuario ganha filtro opcional por categoria (querystring).
Retorno da listagem inclui a categoria de cada arquivo, pra UI mostrar/agrupar.

T6 — Frontend

signup.html/signup.js: seletor de perfil no cadastro.
file.html/pushFile.js: seletor de categoria no upload, populado pela rota de T3.
file.html/pullFile.js: exibir/filtrar por categoria na listagem (badge, dropdown de filtro — like o extFilter que já existe).