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

# Banco de Dados

A tecnologia de banco de dados ainda não foi definida.

As opções consideradas incluem bancos relacionais, como PostgreSQL ou MySQL.

Nenhuma implementação deve assumir um banco específico até que exista uma decisão oficial do grupo.

O acesso ao banco de dados deve ficar isolado na camada de Repository, permitindo que a tecnologia de persistência seja substituída com o menor impacto possível.

---

# Tecnologia de Acesso ao Banco

O ORM, query builder ou driver de banco ainda não foi definido.

Possíveis opções incluem:

- Prisma
- Sequelize
- TypeORM
- Drizzle
- driver nativo do banco, como `pg` ou `mysql2`

A escolha definitiva deve ocorrer somente após a definição do banco de dados.

O assistente não deve instalar nem configurar um ORM sem aprovação explícita do usuário.

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

- PostgreSQL

Hospedagem:

- Supabase

---

## ORM

O projeto utilizará o Prisma como ORM.

O Prisma será responsável pela comunicação entre o backend e o banco PostgreSQL.

Sempre que possível utilizar o Prisma Client.

SQL puro somente quando existir necessidade técnica claramente justificada.

---

## Bibliotecas Padrão

Sempre priorizar as seguintes bibliotecas:

- Express
- Prisma
- JWT
- bcrypt
- Zod
- Helmet
- CORS
- dotenv

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

Todo o código deve ser escrito em inglês.

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
const userNotFound = true;

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

O banco será modelado em PostgreSQL.

O diagrama já existe e será utilizado como referência durante o desenvolvimento.

Sempre priorizar:

- normalização
- integridade referencial
- índices quando necessário

Evitar duplicação de dados.

---

# ORM

O Prisma é o ORM oficial do projeto.

Sempre que possível utilizar:

```js
await prisma.user.findUnique(...)
```

Evitar SQL puro.

SQL deverá ser utilizado apenas quando oferecer uma vantagem técnica significativa.

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