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