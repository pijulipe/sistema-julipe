# Contexto Oficial do Projeto — JULIPE

> Documento principal de arquitetura, desenvolvimento e regras de negócio.
>
> Revisado a partir do código em 22/08/2026.
>
> Se uma solicitação conflitar com uma decisão confirmada aqui, informar o conflito antes de alterar o projeto. Regras pendentes não podem ser decididas por suposição: solicitar confirmação e documentá-la antes da implementação.

---

# Visão Geral

O JULIPE é um sistema web de gerenciamento interno de uma doceria, abrangendo pedidos, clientes, funcionários, produção, estoque, produtos, combos, expedição, relatórios e configurações.

O projeto está em desenvolvimento. Autenticação e clientes já estão integrados entre frontend, backend e banco. Os demais módulos exibidos no frontend são, em sua maioria, protótipos funcionais mantidos apenas no estado do React, sem persistência pela API.

Princípios obrigatórios:

- segurança, organização e facilidade de manutenção;
- código limpo, baixo acoplamento e alta coesão;
- estruturas preparadas para crescimento;
- validação de entradas e permissões no backend;
- decisões pendentes nunca devem ser inferidas do protótipo visual.

---

# Arquitetura e Stack

```text
Frontend React + Vite
        ↓ API REST/JSON
Backend Node.js + Express
        ↓ Prisma Client (somente Repositories)
PostgreSQL hospedado no Supabase
```

## Frontend

- React 19, Vite, JavaScript com ES Modules e Context API;
- Supabase JS para autenticação;
- Tailwind CSS, CSS próprio e Lucide React;
- variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `VITE_API_URL`;
- hospedagem prevista: Vercel.

## Backend

- Node.js 20 ou superior, Express 5 e JavaScript com ES Modules;
- API REST, Prisma 6, Zod, jsonwebtoken, Helmet, CORS e dotenv;
- testes com `node:test`;
- hospedagem prevista: Render.

## Banco e autenticação

- PostgreSQL e Supabase Auth;
- RLS habilitada nas tabelas do `schema.sql`;
- Prisma Client para persistência no backend.

`bcrypt` só será necessário caso o backend passe a armazenar senhas. No fluxo atual, credenciais pertencem ao Supabase Auth e não passam pelo backend. Evitar dependências novas quando a stack atual resolver o problema. Trocas de tecnologia principal exigem aprovação.

---

# Estrutura Atual

```text
PI - JULIPE/
├── client/                    # React/Vite
│   └── src/
│       ├── config/            # API e Supabase
│       ├── services/          # HTTP e autenticação
│       ├── *Context.jsx       # estado compartilhado
│       └── *Panel/Modal.jsx   # telas e componentes
├── server/                    # API Express
│   ├── prisma/schema.prisma
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   └── test/
├── documentacao_bd/
├── schema.sql                 # criação oficial do banco
└── AGENTS.md
```

O diretório real do backend é `server/`, não `backend/`.

---

# Padrões Utilizados

## Backend em camadas

- **Routes:** endpoints, middlewares e composição de dependências.
- **Controllers:** adaptação HTTP; recebem dados validados, chamam Services e respondem. Não contêm regras nem Prisma.
- **Services:** regras de negócio e erros esperados por `ErroAplicacao`.
- **Repositories:** único local autorizado a importar Prisma e acessar o banco.
- **Validators:** contratos de corpo, parâmetros e consulta com Zod.
- **Middlewares:** autenticação, acesso atual, autorização, validação e erros.

As dependências são injetadas por construtor na composição das rotas. Preservar esse padrão para manter baixo acoplamento e testes com dependências substitutas.

## Convenções

- Todo código, arquivo, endpoint, comentário, log e mensagem deve permanecer em português.
- JavaScript e API usam `camelCase`; o banco usa `snake_case`.
- Prisma pode usar `@map` e `@@map` para conciliar as convenções.
- IDs `BIGINT` devem ser serializados como texto no JSON.
- Exclusão histórica segue `item_ativo = false` e `deletado_em`, quando prevista.
- Datas sem horário usam `AAAA-MM-DD` e devem ser validadas como datas reais.

## Contrato HTTP atual

- sucesso: `dados` e, quando útil, `mensagem`;
- paginação: `dados` e `paginacao`;
- falha: `mensagem`, podendo incluir `detalhes` ou `erros`;
- validação `422`, autenticação `401`, permissão `403`, ausência `404`;
- criação `201`, exclusão sem corpo `204`, erro inesperado `500`.

## Frontend

- HTTP em `client/src/services/`;
- configuração externa em `client/src/config/`;
- estado compartilhado por Providers e hooks;
- respostas `401` no módulo de clientes encerram a sessão;
- autenticação e clientes usam serviços reais. Não copiar o estado em memória dos módulos prototipados para integrações definitivas.

---

# Estado Atual da Implementação

## Integrado

### Infraestrutura

- Express com Helmet, CORS por origens e JSON limitado a 1 MB;
- `GET /api/saude`;
- ambiente validado com Zod;
- erros e rota inexistente tratados centralmente;
- encerramento gracioso e desconexão do Prisma.

### Autenticação

- login por e-mail e senha no Supabase Auth;
- troca do token Supabase em `POST /api/autenticacao/entrar`;
- validação de tokens Supabase HS256 ou ES256;
- ES256 usa JWKS com cache de 10 minutos e nova consulta ao não achar a chave;
- validação de emissor, audiência `authenticated` e expiração;
- vínculo por `usuarios.id_autenticacao_supabase`;
- rejeição de funcionário inativo, excluído ou não vinculado;
- JWT interno HS256 com validade de 8 horas;
- renovação do token interno após renovação da sessão Supabase;
- logout se a troca de token falhar.

O JWT interno contém `sub`, `perfilAcesso` e `permissoes`. Rotas protegidas devem recarregar do banco o perfil, a atividade e as permissões atuais antes de autorizar; o token não é a fonte definitiva de autorização.

### Autorização de clientes

```text
autenticar JWT
  → carregar acesso atual do banco
  → autorizar CLIENTES
  → validar entrada
  → Controller → Service → Repository
```

- `GERENTE` possui acesso hierárquico;
- outros perfis precisam da permissão individual ativa `CLIENTES`;
- concessões, revogações e desativação valem na requisição seguinte.

### Clientes

- `POST /api/clientes`: cadastrar;
- `GET /api/clientes`: listar, paginar e buscar por nome, telefone ou bairro;
- `GET /api/clientes/:id`: consultar;
- `PUT /api/clientes/:id`: substituir campos editáveis;
- `PATCH /api/clientes/:id`: alterar parcialmente;
- `DELETE /api/clientes/:id`: excluir logicamente.

Nome e telefone são obrigatórios. Telefone é validado, mas não é único. Vazios opcionais são normalizados para `null`. Excluídos não aparecem nas consultas comuns.

### Testes existentes

Cobrem autenticação HS256/ES256, audiência, assinatura, expiração, vínculo, endpoint de login, autorização por módulo, recarga/revogação de acesso e regras principais do Service de clientes.

## Parcial ou protótipo

- pedidos, produtos, combos, funcionários, estoque e configurações usam estado React em memória;
- IDs são contadores locais e os dados se perdem ao recarregar;
- produção, expedição, dashboard e relatórios calculam sobre pedidos em memória;
- o fluxo visual de status permite avanços e retornos, mas não define a regra final;
- horários, alertas de capacidade e baixa automática de estoque são provisórios;
- funcionários e seleção de telas não usam API nem cargos definitivos;
- não há rotas backend para esses módulos.

Comportamentos desses protótipos orientam interface e discussão, mas não confirmam regras pendentes.

---

# Segurança

Nunca confiar no frontend. Validar autenticação, usuário atual, autorização e entrada no backend.

- Prisma somente em Repositories.
- Segredos somente em ambiente.
- Nunca expor `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_JWT_SECRET`, senhas ou tokens.
- `VITE_SUPABASE_ANON_KEY` é pública e não substitui autorização.
- Restringir algoritmos JWT e validar emissor, audiência e expiração.
- Erros `500` não revelam detalhes internos.
- RLS é defesa adicional, não substituta da API.

Ambiente backend: `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `PORTA`, `ORIGENS_PERMITIDAS` e `NODE_ENV`.

## Alertas abertos

- várias políticas RLS ainda concedem acesso total a qualquer usuário `authenticated`;
- `limites_horario` ainda não restringe escrita ao gerente;
- existem políticas redundantes em `usuarios`;
- dados de negócio devem continuar passando pela API, não diretamente pelo Supabase;
- a autorização de `ADMINISTRADOR` no backend ainda precisa ser confirmada.

Alterações de RLS ou permissões exigem proposta e confirmação.

---

# Banco de Dados e Prisma

`schema.sql` é a referência oficial de criação. `server/prisma/schema.prisma` mapeia o banco. Mudanças estruturais devem mantê-los coerentes, mas não modelar pendências sem aprovação. Check constraints e RLS exigem tratamento adicional em migrações; não presumir que o Prisma sozinho recria todas as garantias.

O banco representa categorias, produtos, combos, clientes, usuários, permissões individuais, limites, entregadores, acessórios, pedidos, itens, configurações, exclusão lógica, índices, RLS e sincronização de novos usuários do Supabase Auth com perfil inicial `ATENDENTE`.

## Características observáveis, ainda sujeitas às regras pendentes

- podem existir vários `GERENTE` e `ADMINISTRADOR`;
- perfis atuais: `ADMINISTRADOR`, `GERENTE` e `ATENDENTE`;
- permissões individuais são textos ligados ao usuário;
- telefone de cliente é obrigatório e repetível;
- cliente possui um único conjunto de endereço;
- pedido pode conter produtos e combos, com referência exclusiva por item;
- `preco_unitario` preserva o preço da venda;
- endereço da venda não é preservado no pedido;
- existe uma única forma de pagamento textual;
- pagamentos: `PENDENTE`, `PAGO`, `PARCIAL`, `REJEITADO`, `ESTORNADO`, `CANCELADO`;
- não há valor pago, saldo ou parcelas para `PARCIAL`;
- desconto percentual e em valor coexistem sem regra de combinação;
- imagens são URLs sem serviço ou limites definidos;
- `limites_horario` guarda data, intervalo, limite, agendados e bloqueio;
- pedido guarda apenas `id_usuario_atendente`, sem auditoria completa de alterações.

---

# Regras Confirmadas

## Clientes

- Gerente possui acesso total.
- Funcionário precisa do módulo `CLIENTES`.
- Telefone é obrigatório e pode repetir.
- Exclusão é lógica.

## Usuários e permissões

- O modelo futuro combinará permissões do cargo e individuais.
- Cada módulo poderá ser concedido ou retirado por funcionário.
- Limite de desconto será definido por cargo.
- Gerente poderá autorizar desconto acima do limite.

`permissoes_funcionario` resolveu permissões individuais simples e já protege clientes. Não resolve cargos configuráveis, herança nem exceções negativas; o modelo combinado continua incompleto.

## Pedidos e auditoria

- Status podem saltar etapas; `RECEBIDO → PRONTO` é permitido.
- Entregues e cancelados não reabrem, faltando decidir a exceção do gerente.
- Cancelados ficam nos relatórios e não entram no faturamento.
- Endereço de entrega inicia com o do cliente e pode ser alterado na venda.
- Deve-se registrar a atendente responsável por criação, edição, cancelamento e mudança de status.

## Capacidade

- Controle por intervalos configuráveis.
- Gerente define duração e quantidade máxima.
- Intervalo lotado rejeita novos pedidos.
- Duração e quantidade não podem ser fixadas no código.

---

# Decisões Pendentes com a Doceria

Não implementar comportamento definitivo destes itens sem confirmação. Quando houver resposta, atualizar primeiro as regras confirmadas.

## Usuários e permissões

- Quais cargos configuráveis existirão?
- A exceção individual concede, retira herança do cargo ou faz ambos?
- Qual é a função de `ADMINISTRADOR` e seu nível de acesso?
- Autorização de desconto extra vale para uma venda ou pode ser permanente?
- Como persistir a auditoria de cada ação no pedido?

## Pedidos

- Quais transições e retornos serão permitidos?
- Gerente poderá reabrir entregue ou cancelado?
- Alterar endereço no pedido atualiza o cliente ou só a venda?
- O endereço efetivo deve ficar preservado no pedido?

## Pagamentos e descontos

- Quais formas de pagamento?
- Haverá múltiplas formas no mesmo pedido?
- Como representar parcial, valor pago e saldo?
- Como combinar desconto em valor e porcentagem?

## Estoque e produção

- Quando baixar estoque?
- Cancelamento sempre devolve itens?
- Estoque representa produtos, ingredientes ou ambos?
- Haverá controle de ingredientes?

Questões exclusivas de estoque podem aguardar o planejamento previsto para o próximo ano.

## Capacidade

- Todo pedido ocupa uma vaga igualmente?
- Cancelado libera vaga?
- Gerente pode exceder o limite?
- Configuração varia por dia da semana ou data?
- Limite será por pedidos, itens/categorias ou ambos?

## Arquivos

- Onde armazenar fotos e imagens?
- Quais formatos, dimensões, tamanhos e quantidades?
- Quem pode visualizar, substituir e excluir?

---

# Diretrizes de Evolução

- Respeitar camadas e padrões atuais.
- Controllers pequenos, regras em Services, banco em Repositories.
- Validar contratos com Zod.
- Criar funções pequenas e evitar duplicação.
- Não modificar arquivos sem relação com a tarefa.
- Preservar alterações de outros desenvolvedores.
- Cobrir regras relevantes com testes proporcionais ao risco.
- Não transformar protótipo frontend em regra confirmada.
- Não alterar arquitetura, biblioteca, banco ou regra pendente sem aprovação.

Mudanças arquiteturais devem ser propostas antes, explicando problema, solução, impactos, migração, vantagens, desvantagens e alternativas.

---

# Comandos do Backend

Dentro de `server/`:

```bash
npm run dev
npm start
npm test
npm run banco:testar
npm run prisma:gerar
npm run prisma:validar
```

`banco:testar` consulta a conexão sem alterar dados. Nunca registrar o conteúdo do `.env`.

---

# Princípio Geral

O objetivo é um sistema funcional, profissional, seguro, escalável e fácil de evoluir. Priorizar arquitetura, clareza e manutenção. Quando faltar decisão de negócio, documentar a dúvida e aguardar confirmação.
