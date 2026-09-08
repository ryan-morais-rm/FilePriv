# Meta:
### -> Deploy na nuvem

### Deploy
-> A aplicação precisa estar containerizada. 
-> Código Terraform
-> Código Ansible que configura o manager e os nodes. 
-> Código terraform que faz a configuração de load balancer, SGs, ACLs...


BACKLOG

Pipeline de arquivo (fim a fim)
- Rust: subir a chave de criptografia gerada para o bucket S3 dedicado, e devolver
  ao Node a referência real (hoje é só um placeholder "PENDENTE-CHAVE-NAO-PERSISTIDA-...")
- Implementar o download: Node pede ao Rust → Rust busca a chave no S3 → busca o
  arquivo no servidor via SFTP → descriptografa → envia os bytes de volta ao Node
  → Node entrega ao usuário (hoje retorna 501, stub)
- Implementar a exclusão: Rust apaga o arquivo no servidor via SFTP + apaga a chave
  no S3 → confirma ao Node → só então o Node remove o registro do Postgres
  (hoje retorna 501, stub)
- Teste ponta a ponta do pipeline atual: upload → cripto → SFTP → listagem →
  download → decripto → delete

Infraestrutura de servidores
- Decidir o que fazer com a ideia original de expor "Descobrir Servidores" no
  homepage.html pro usuário final — hoje isso foi resolvido via admin.html
  (separado, só pro admin); confirmar se ainda falta algo ali ou se está coberto
- TLS na comunicação Node↔Rust (hoje é grpc.credentials.createInsecure(),
  com TODO marcado no código)
- Limpar do docker-compose.yml os volumes órfãos de chave SSH que sobraram do
  agente antigo (não são mais lidos desde que a autenticação virou em memória)

Frontend
- Mesclar login.html e signup.html numa única página com navegação por hover
  (mouse à esquerda → cadastro, à direita → login) — foi iniciado e ficou
  pendente no meio de outras prioridades, nunca foi entregue

Integrações futuras (independentes do pipeline de armazenamento)
- Integração com AWS S3 como destino opcional escolhido pelo usuário
  (bucket + Access Key/Secret Key) — mencionado desde o início, não iniciado
- Integração com Google Drive como destino opcional — forma de integração
  ainda não definida