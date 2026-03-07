# Meta:
### -> Deploy na nuvem

## Problemas

### Frontend
-> Mecanismo de pesquisa de arquivos, por exemplo pesquisar pdf, docx...

-> É preciso definir um tamanho máximo de arquivo. Será consumido uma API no backend.

-> As alterações de senha e e-mail na homepage.html estão chumbadas no frontend. 

-> Refatoração dos arquivos .js do frontend, está tudo numa função só em seu respectivo arquivo. 

### Backend
-> É necessário uma rota no homepage.html que altere a senha e o e-mail no homepage.html

-> Fazer a validação de tamanho do arquivo no backend. Se um arquivo maior que 100MB for recebido,
   leva block. 

-> É necessário de rotas no servers.html que cadastre o nome dos nodes, ip interno, porta, 
   CPU, memória e quantidade de disco dos nodes. Com isso, o backend faz a comunicação com
   essas máquinas e verifica se estão ativas ou prontas, se não estiverem, gera log. 

-> É preciso de uma API para "node.js <-> Rust", porque o Rust está monitorando uma pasta
   "/uploads" e isso não é interessante. 

-> Precisa resolver o problema do sharding, fazendo a divisão por meio do tamanho do arquivo e não 
   por meio de buffers. A forma como está primeiro precisa encher um buffer todo para depois usar o
   outro e assim sucessivamente. Isso está errado. 

-> Preciso desenvolver um mecanismo de armazenamento das chaves que criptografam os shards dos arquivos,
   essas chaves não serão armazenadas localmente. Elas vão ser armazenadas em um bucket remoto
   ou qualquer coisa do tipo. 

### Deploy
-> A aplicação precisa estar containerizada. 

-> Código Terraform que crie 4 instâncias na nuvem. 1 manager e 3 nodes. 

-> Código Ansible que configura o manager e os nodes. 

-> Código terraform que faz a configuração de load balancer, SGs, ACLs...