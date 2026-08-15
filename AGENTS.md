# Backend Context - JULIPE

> Documento oficial de arquitetura e desenvolvimento do backend.
>
> Este arquivo serve como contexto principal para qualquer IA (Codex, ChatGPT, Cursor, Claude etc.) e também para qualquer desenvolvedor que participe do projeto.
>
> Todas as implementações devem seguir as diretrizes descritas neste documento.
>
> Caso exista conflito entre este documento e uma nova solicitação do usuário, o assistente deve informar o conflito e solicitar confirmação antes de modificar a arquitetura, regras de negócio ou padrões estabelecidos.

---

# Sobre o Projeto

O projeto consiste em um sistema web para gerenciamento interno de uma doceria.

O objetivo é organizar e facilitar o gerenciamento de pedidos, clientes, funcionários e demais processos internos da empresa.

O backend deve ser desenvolvido pensando em:

- organização
- segurança
- escalabilidade
- facilidade de manutenção
- código limpo
- baixo acoplamento
- alta coesão

O projeto poderá crescer ao longo do desenvolvimento.

Portanto, nenhuma implementação deve assumir que a estrutura atual será definitiva.

---

# Arquitetura Geral

Frontend

React + Vite

↓

Backend

Node.js + Express

↓

ORM

Prisma

↓

Banco de Dados

PostgreSQL (Supabase)

---

# Banco de Dados

O banco de dados oficial do projeto será o PostgreSQL disponibilizado pelo Supabase.

O Supabase será utilizado para hospedagem e gerenciamento da infraestrutura do banco de dados.

O acesso ao banco de dados deve ficar isolado na camada de Repository, permitindo que a tecnologia de persistência seja substituída com o menor impacto possível.

---

# Tecnologia de Acesso ao Banco

O Prisma será o ORM oficial do projeto.

Todo acesso ao banco deverá continuar isolado na camada de Repository. Services e Controllers não devem acessar o Prisma diretamente.

---

# Stack Tecnológica

## Frontend

- React
- Vite
- JavaScript

Hospedagem:

- Vercel

---

## Backend

- Node.js
- Express
- API REST

Hospedagem:

- Render

---

## Banco de Dados

- PostgreSQL (Supabase)

Hospedagem:

- Supabase

---

## ORM

O projeto utilizará o Prisma como ORM oficial.

O Prisma Client será utilizado pelos Repositories para a comunicação com o PostgreSQL do Supabase.

SQL puro deverá ser utilizado apenas quando existir uma necessidade técnica claramente justificada.

---

## Bibliotecas Padrão

Sempre priorizar as seguintes bibliotecas:

- Express
- JWT
- bcrypt
- Zod
- Helmet
- CORS
- dotenv
- Prisma

Evitar adicionar novas dependências quando alguma biblioteca já utilizada resolver o problema.

Caso seja necessário trocar uma biblioteca principal, solicitar aprovação do usuário.

---

# Organização do Projeto

Estrutura esperada:

backend/

src/

controllers/

services/

repositories/

routes/

middlewares/

validators/

config/

utils/

database/

server.js

Cada camada possui uma responsabilidade específica.

Controllers

- recebem requisições
- chamam services
- retornam respostas

Services

- concentram toda regra de negócio

Repositories

- acesso ao banco de dados

Validators

- validações

Middlewares

- autenticação
- autorização
- tratamento de erros
- demais responsabilidades transversais

---

# Idioma do Projeto

Todo o código deve ser escrito em português.

Isso inclui:

- variáveis
- funções
- classes
- arquivos
- pastas
- tabelas
- colunas
- endpoints
- comentários técnicos
- logs
- nomes internos

As mensagens destinadas ao usuário devem permanecer em português.

Exemplo:

```js
const usuarioNaoEncontrado = true;

return res.status(404).json({
    message: "Usuário não encontrado."
});
```

---

# API

A API seguirá o padrão REST.

Utilizar corretamente:

- GET
- POST
- PUT
- PATCH
- DELETE

Sempre utilizar códigos HTTP apropriados.

---

# Autenticação

Inicialmente utilizar JWT.

Fluxo esperado:

Login

↓

Validação

↓

JWT

↓

Frontend envia Authorization Bearer Token

↓

Backend valida token

↓

Executa a operação

---

# Sistema de Permissões

O sistema possui hierarquia de usuários.

Essa estrutura deverá permitir crescimento futuro.

## Gerente

Possui acesso total.

Pode:

- cadastrar funcionários
- editar funcionários
- remover funcionários
- alterar permissões
- acessar qualquer tela
- acessar qualquer funcionalidade

---

## Funcionário

As permissões serão determinadas pelo gerente.

Cada funcionário poderá possuir acesso apenas aos módulos autorizados.

Exemplos:

- pedidos
- clientes
- produção
- estoque
- financeiro
- relatórios
- configurações

Novas permissões poderão surgir futuramente.

A arquitetura deve facilitar essa expansão.

---

# Segurança

Nunca confiar em informações enviadas pelo frontend.

Sempre:

- validar entradas
- validar permissões
- validar autenticação

Utilizar:

- Helmet
- CORS
- bcrypt
- JWT
- variáveis de ambiente
- Prisma

Nunca expor:

- DATABASE_URL
- JWT_SECRET
- senhas
- credenciais
- tokens privados

---

# Banco de Dados

O banco de dados oficial será PostgreSQL, hospedado e gerenciado pelo Supabase.

O diagrama já existe e será utilizado como referência durante o desenvolvimento.

Sempre priorizar:

- normalização
- integridade referencial
- índices quando necessário

Evitar duplicação de dados.

---

# ORM

O Prisma será o ORM oficial do projeto e deverá ser utilizado considerando:

- compatibilidade com o banco escolhido
- segurança
- facilidade de manutenção
- suporte a migrações
- desempenho
- maturidade da tecnologia
- experiência da equipe

O acesso ao Prisma deve permanecer restrito à camada de Repository.

---

# Regras de Negócio

Esta seção deverá crescer conforme o projeto evoluir.

Toda nova regra importante deverá ser documentada aqui.

Exemplos:

- fluxo dos pedidos
- controle de produção
- descontos
- fechamento de caixa
- controle de funcionários
- permissões
- clientes
- pagamentos

## Clientes

- O gerente possui acesso total ao módulo de clientes.
- Funcionários somente podem cadastrar, consultar, alterar ou excluir clientes quando possuírem acesso ao módulo `CLIENTES`.
- O telefone do cliente é obrigatório, mas pode se repetir em cadastros diferentes, conforme o esquema atual.
- A exclusão de clientes é lógica: o registro deve ser marcado como inativo e receber a data de exclusão, preservando seu histórico.

## Usuários e Permissões

- O modelo de permissões combinará permissões associadas ao cargo com permissões individuais por funcionário.
- Cada módulo do sistema deverá poder ser concedido ou retirado individualmente para cada funcionário.
- O sistema deverá registrar o nome da atendente responsável pela criação, edição, cancelamento e alteração de status de cada pedido.
- O limite de desconto será definido por cargo.
- O gerente poderá autorizar um desconto acima do limite definido para o cargo do funcionário.

## Pedidos e Auditoria

- As mudanças de status não precisarão seguir obrigatoriamente todas as etapas intermediárias; por exemplo, um pedido poderá passar diretamente de `RECEBIDO` para `PRONTO`.
- Pedidos entregues ou cancelados não poderão ser reabertos. Permanece pendente confirmar se o gerente será uma exceção a essa regra.
- Pedidos cancelados deverão permanecer visíveis nos relatórios.
- Pedidos cancelados deverão ser excluídos de todos os cálculos de faturamento.
- Ao criar um pedido para entrega, o endereço deverá ser inicialmente preenchido com o endereço cadastrado do cliente e poderá ser alterado para aquela venda.
- Ainda deverá ser confirmado se a alteração feita durante o pedido também atualizará o cadastro do cliente e como o endereço efetivamente utilizado será preservado no histórico do pedido.

## Capacidade de Produção

- A capacidade de produção será controlada por intervalos de horário configuráveis.
- O gerente poderá definir a duração de cada intervalo e a quantidade máxima de pedidos aceita nele.
- Exemplo de configuração: no máximo 5 pedidos a cada 30 minutos.
- Quando o limite de um intervalo for atingido, o sistema não deverá aceitar novos pedidos para esse mesmo intervalo.
- A configuração deverá permanecer flexível, sem fixar no código a duração do intervalo nem a quantidade máxima de pedidos.

## Decisões representadas pelo esquema atual

O arquivo `schema.sql` representa atualmente as decisões abaixo. Essas decisões deverão ser validadas com a doceria antes de serem tratadas como definitivas caso ainda não tenham sido confirmadas diretamente por ela.

- O banco permite cadastrar mais de um gerente, pois o perfil é atribuído individualmente a cada usuário e não existe restrição de unicidade para o perfil `GERENTE`.
- O telefone do cliente é obrigatório, mas não é único.
- Cada cliente possui somente um conjunto de campos de endereço na tabela `clientes`; o modelo atual não permite vários endereços estruturados por cliente.
- Para clientes, os dados de negócio obrigatórios são nome e telefone.
- Um mesmo pedido pode conter produtos e combos simultaneamente, embora cada item individual deva referenciar exclusivamente um produto ou um combo.
- Os preços dos itens são registrados no pedido por meio do campo `preco_unitario`, preservando o preço praticado na venda.
- O endereço utilizado na venda não é preservado separadamente no pedido; atualmente ele permanece apenas no cadastro do cliente.
- Cada pedido possui somente um campo textual de forma de pagamento. O modelo atual não representa múltiplas formas de pagamento no mesmo pedido.
- Os estados de pagamento disponíveis são `PENDENTE`, `PAGO`, `PARCIAL`, `REJEITADO`, `ESTORNADO` e `CANCELADO`.
- Apesar de existir o estado `PARCIAL`, o banco não possui campos ou registros separados para valor pago e valor restante.
- O banco possui campos para desconto percentual e desconto em valor, mas não define as regras de aplicação, prioridade ou combinação entre eles.
- O banco registra a URL de imagens de produtos e de fotos de referência dos pedidos, mas não define o serviço de armazenamento nem as regras de formato e tamanho dos arquivos.
- A tabela `limites_horario` permite representar intervalos, limite de pedidos, quantidade agendada e bloqueio. A autorização para configurar esses limites deverá ser restrita ao gerente na implementação; a política RLS atual ainda permite escrita a qualquer usuário autenticado.

## Incompatibilidade de permissões a resolver

O modelo combinado de permissões por cargo e por funcionário está confirmado, mas o esquema atual oferece apenas perfis fixos de acesso (`ADMINISTRADOR`, `GERENTE` e `ATENDENTE`). Ele ainda não representa cargos configuráveis, permissões associadas aos cargos, permissões individuais por módulo nem exceções individuais sobre as permissões do cargo. A implementação dessa decisão exigirá proposta de modelagem e aprovação antes da alteração do banco de dados.

---

# Decisões Pendentes com a Doceria

As regras abaixo ainda precisam ser confirmadas com a doceria antes da modelagem definitiva do banco de dados e da implementação dos módulos relacionados.

## Usuários e Permissões

- Como as permissões individuais serão combinadas com as do cargo: somente para conceder acessos adicionais, somente para retirar acessos ou para permitir ambos os tipos de exceção?
- A autorização do gerente para ultrapassar o limite de desconto valerá somente para uma venda específica ou poderá ser permanente para determinado funcionário?

## Pedidos

- Além do salto confirmado de `RECEBIDO` para `PRONTO`, quais outras transições e retornos entre status serão permitidos?
- A proibição de reabrir pedidos entregues ou cancelados também se aplica ao gerente, ou o gerente será a única exceção?
- Ao alterar o endereço durante a criação do pedido, a mudança deverá atualizar o cadastro do cliente ou valer somente para aquela venda?
- O endereço efetivamente utilizado na venda deverá ser preservado no pedido, sem ser afetado por futuras alterações no cadastro do cliente?

## Pagamentos e Descontos

- Quais formas de pagamento serão utilizadas?
- Como funcionarão descontos em valor e em porcentagem?

## Estoque e Produção

- Em qual momento o estoque deverá ser descontado?
- O cancelamento de um pedido sempre deverá devolver itens ao estoque?
- O estoque representará produtos prontos, ingredientes ou ambos?
- Será necessário controlar estoque de ingredientes futuramente?

As decisões exclusivas do estoque poderão ser adiadas até o planejamento desse módulo, previsto para o próximo ano. A integração entre cancelamento de pedidos e devolução ao estoque também poderá ser definida nessa etapa, sem bloquear a implementação atual dos pedidos.

## Capacidade de Produção — detalhes pendentes

- Todos os pedidos ocuparão uma vaga igualmente, independentemente da quantidade e da complexidade dos itens?
- Pedidos cancelados liberarão a vaga do intervalo?
- O gerente poderá autorizar pedidos acima do limite?
- Poderão existir configurações diferentes conforme o dia da semana ou uma data específica?

## Arquivos e Fotos

- Onde serão armazenadas as fotos de referência dos pedidos e as imagens dos produtos?
- Quais formatos, tamanhos e limites de arquivo serão aceitos?

Enquanto essas decisões estiverem pendentes, o assistente não deverá assumir comportamentos definitivos para essas regras.

Quando as respostas forem fornecidas, elas deverão ser documentadas na seção de Regras de Negócio antes da implementação correspondente.

---

# Escalabilidade

Sempre considerar que futuramente poderão existir:

- novos módulos
- novos cargos
- novas permissões
- novos relatórios
- novas regras de negócio

Evitar implementações rígidas.

---

# Diretrizes de Desenvolvimento

## Arquitetura

- Respeitar a arquitetura existente.
- Não alterar padrões do projeto sem aprovação.
- Não modificar arquivos desnecessariamente.
- Priorizar soluções escaláveis.

---

## Organização do Código

- Utilizar nomes claros.
- Criar funções pequenas.
- Evitar duplicação.
- Evitar funções gigantes.
- Controllers apenas recebem e respondem.
- Toda regra de negócio pertence aos Services.
- Banco apenas pelos Repositories.

---

## Qualidade

Sempre priorizar:

- legibilidade
- simplicidade
- manutenção
- segurança
- consistência
- baixo acoplamento
- alta coesão

Evitar "gambiarras".

---

## Alterações de Arquitetura

Caso uma melhoria exija alteração estrutural:

Não implementar automaticamente.

Primeiro explicar:

- problema encontrado
- impactos
- vantagens
- desvantagens

Somente implementar após aprovação explícita do usuário.

---

## Conflitos

Caso qualquer implementação viole alguma diretriz deste documento:

O assistente deve parar imediatamente.

Nunca decidir sozinho.

Sempre solicitar confirmação do usuário.

---

## Dúvidas

Caso exista qualquer dúvida sobre:

- regra de negócio
- arquitetura
- modelagem
- permissões
- banco de dados
- impacto de alterações

Perguntar antes de implementar.

Nunca assumir comportamento sem confirmação.

---

# Princípio Geral

O objetivo do projeto não é apenas criar um sistema funcional.

O objetivo é desenvolver um backend organizado, profissional, seguro, escalável e fácil de manter.

Sempre que existir mais de uma solução possível, priorizar aquela que melhor preserve a arquitetura, a manutenção do código e a evolução futura do projeto.
