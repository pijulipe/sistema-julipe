# Contexto Oficial do Projeto — JULIPE

> Documento principal de arquitetura, desenvolvimento e regras de negócio.
>
> Implementação revisada em 02/09/2026. Regras de negócio consolidadas com o usuário em 03/09/2026.
>
> As novas regras abaixo estão aprovadas para implementação futura; esta revisão é exclusivamente documental e não altera código, SQL, Prisma ou banco. Veja também `documentacao_bd/07_decisoes_confirmadas_2026-09-03.md`.
>
> Se uma solicitação conflitar com uma decisão confirmada aqui, informar o conflito antes de alterar o projeto. Regras pendentes não podem ser decididas por suposição: solicitar confirmação e documentá-la antes da implementação.

---

# Visão Geral

O JULIPE é um sistema web de gerenciamento interno de uma doceria, abrangendo pedidos, clientes, funcionários, produção, estoque, produtos, combos, expedição, relatórios e configurações.

O projeto está em desenvolvimento. Autenticação, clientes, funcionários, produtos e combos já estão integrados entre frontend, backend e banco. Os demais módulos exibidos no frontend são, em sua maioria, protótipos funcionais mantidos apenas no estado do React, sem persistência pela API.

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
- API REST, Prisma 6, Zod, jsonwebtoken, Helmet, CORS, dotenv e `@supabase/supabase-js` (Admin API, somente no backend);
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

### Funcionários

- `POST /api/funcionarios`: cadastrar (cria a conta no Supabase Auth via Admin API e a linha em `usuarios`, com permissões iniciais `CLIENTES` e `PEDIDOS`);
- `GET /api/funcionarios`: listar, paginar e filtrar por busca, perfil e atividade;
- `GET /api/funcionarios/:id`: consultar, com `acessoTotal` e `acoesPermitidas` calculados pelo backend conforme o autor da requisição;
- `PATCH /api/funcionarios/:id`: atualizar dados cadastrais (nome, situação ativa);
- `PATCH /api/funcionarios/:id/perfil`: alterar perfil de acesso;
- `PUT /api/funcionarios/:id/permissoes`: substituir permissões individuais.

Cadastro usa `@supabase/supabase-js` (Admin API) com `SUPABASE_SERVICE_ROLE_KEY`, restrito ao backend. Contas criadas por essa rota são marcadas com `user_metadata.criado_por_admin`, para o gatilho `handle_new_user()` não sobrescrever o perfil escolhido (ver Segurança e Banco de Dados e Prisma). Autorização segue `podeCadastrarPerfil`, `podeEditarPermissoes` e `podeAlterarPerfil` (ver Regras Confirmadas → Usuários e permissões). Não há rota de exclusão de funcionários.

### Produtos e categorias

- Produtos possuem CRUD completo em `/api/produtos`, filtros, paginação, ativação, inativação e exclusão lógica.
- Categorias fixas ativas são consultadas em `/api/categorias-produtos` e validadas no backend.
- O módulo é protegido por recarga de acesso atual e permissão `PRODUTO`.
- Fotos de Bolos e Doces usam upload direto autorizado pelo backend para o bucket privado `imagens-produtos`; o banco armazena apenas o caminho e a API fornece URLs temporárias de leitura.
- O frontend de Produtos usa a API real, incluindo formulário, filtros, paginação e upload, substituição e remoção da foto.

### Combos

- Combos possuem CRUD completo em `/api/combos`, com busca, paginação, filtro de atividade, ativação, inativação e exclusão lógica.
- A composição é persistida atomicamente em `itens_combo`, valida produtos vigentes e seus múltiplos mínimos e impede produtos repetidos.
- Nome vigente possui unicidade normalizada garantida também por índice parcial no banco.
- Alterações efetivas de nome, preço ou composição incrementam `versao`; descrição isolada e atualizações idempotentes não incrementam.
- Inativação ou exclusão lógica de produto inativa os combos relacionados na mesma transação; reativação de produto não os reativa.
- O módulo é protegido pela recarga de acesso atual e permissão `COMBOS`.
- O frontend de Combos usa a API real, com estados de carregamento, vazio e erro, confirmação de exclusão, filtros e paginação.

### Testes existentes

Cobrem autenticação HS256/ES256, audiência, assinatura, expiração, vínculo, endpoint de login, autorização por módulo, recarga/revogação de acesso, regras principais dos Services de clientes, produtos e combos, contratos de validação e integração transacional entre produtos e combos.

## Parcial ou protótipo

- pedidos, estoque e configurações usam estado React em memória;
- IDs são contadores locais e os dados se perdem ao recarregar;
- produção, expedição, dashboard e relatórios calculam sobre pedidos em memória;
- o fluxo visual de status permite avanços e retornos, mas ainda não implementa integralmente as regras confirmadas em 03/09/2026;
- horários e alertas de capacidade continuam sem persistência; o modelo de cálculo foi confirmado, mas a baixa automática de estoque permanece pendente;
- seleção de telas (`TELAS_ACESSO`, no frontend) ainda não usa API nem cargos definitivos; permissões reais de funcionários usam módulos (`MODULOS_PERMISSAO`), já integrados;
- não há rotas backend para os módulos ainda em protótipo.

Comportamentos desses protótipos só são regras quando explicitamente confirmados nas seções abaixo. A aprovação do modelo de capacidade e dos rótulos de status não aprova indiscriminadamente os demais comportamentos ou falhas do frontend.

---

# Segurança

Nunca confiar no frontend. Validar autenticação, usuário atual, autorização e entrada no backend.

- Prisma somente em Repositories.
- Segredos somente em ambiente.
- Nunca expor `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, senhas ou tokens.
- `VITE_SUPABASE_ANON_KEY` é pública e não substitui autorização.
- Restringir algoritmos JWT e validar emissor, audiência e expiração.
- Erros `500` não revelam detalhes internos.
- RLS é defesa adicional, não substituta da API.

Ambiente backend: `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORTA`, `ORIGENS_PERMITIDAS` e `NODE_ENV`.

## Alertas abertos

- várias políticas RLS ainda concedem acesso total a qualquer usuário `authenticated`, exceto `limites_horario`, corrigida em 28/08/2026 (leitura liberada à equipe autenticada, escrita restrita a `GERENTE` — ver `documentacao_bd/sql/2026-08-28_rls_limites_horario.sql`);
- existem políticas redundantes em `usuarios`;
- dados de negócio devem continuar passando pela API, não diretamente pelo Supabase;
- as políticas RLS atuais ainda não representam integralmente a matriz de administração de funcionários confirmada para a primeira versão.

Alterações de RLS ou permissões exigem proposta e confirmação.

---

# Banco de Dados e Prisma

`schema.sql` é a referência oficial de criação. `server/prisma/schema.prisma` mapeia o banco. Mudanças estruturais devem mantê-los coerentes, mas não modelar pendências sem aprovação. Check constraints e RLS exigem tratamento adicional em migrações; não presumir que o Prisma sozinho recria todas as garantias.

O banco representa categorias, produtos, combos, clientes, usuários, permissões individuais, limites, entregadores, acessórios, pedidos, itens, configurações, exclusão lógica, índices, RLS e sincronização de novos usuários do Supabase Auth com perfil inicial `ATENDENTE`. Essa sincronização (gatilho `handle_new_user()`) não se aplica a contas criadas pela API administrativa (`POST /api/funcionarios`), identificadas por `user_metadata.criado_por_admin`, que definem o perfil escolhido diretamente — corrigido em 28/08/2026 (ver `documentacao_bd/sql/2026-08-28_fix_trigger_handle_new_user.sql`).

Correções pontuais de RLS ou funções aplicadas fora do `schema.sql` ficam registradas em `documentacao_bd/sql/`, cada arquivo com data e motivo.

## Estrutura existente e lacunas em relação às regras confirmadas

Esta lista descreve o banco existente, não o modelo futuro aprovado de negócio. As lacunas exigem proposta de migração antes de implementação.

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
- desconto percentual e em valor coexistem, mas o banco ainda não registra a ordem de aplicação confirmada;
- imagens de pedidos ainda não possuem o fluxo definitivo; fotos cadastrais de produtos já usam Storage conforme a seção de Produtos;
- `limites_horario` guarda data, intervalo, limite, agendados e bloqueio;
- pedido guarda apenas `id_usuario_atendente`, sem auditoria completa de alterações.

---

# Regras Confirmadas

## Clientes

- Gerente possui acesso total.
- Funcionário precisa do módulo `CLIENTES`.
- Telefone é obrigatório e pode repetir.
- Exclusão é lógica.

## Produtos e categorias

- As categorias são fixas nesta primeira versão: `Bolos`, `Doces`, `Salgados`, `Bebidas`, `Congelados` e `Festas`.
- Não haverá administração de categorias; elas são persistidas no banco e consultadas pela API.
- Cada categoria possui uma quantidade padrão por pacote. `Salgados` usa 25 unidades; as demais usam 1, salvo valor confirmado já persistido no banco.
- O produto pode sobrescrever o padrão da categoria. O campo “unidades por pacote” do frontend corresponde a `multiplo_minimo` e determina os múltiplos permitidos para venda.
- `precoUnitario` representa o preço de um pacote definido por `multiploMinimo`, não o preço de cada unidade interna. Exemplo: produto com `multiploMinimo = 25` e `precoUnitario = 20` custa R$ 20 por 25 unidades; 50 unidades custam R$ 40.
- As unidades de medida permitidas são `Unidade`, `Kg`, `Litro`, `Pacote` e `Fatia`.
- O preço não pode ser negativo, o múltiplo mínimo deve ser inteiro maior que zero e o tempo de preparo, em minutos, deve ser inteiro maior ou igual a zero.
- Cada produto pode ter no máximo uma foto, e somente produtos das categorias `Bolos` e `Doces` aceitam foto.
- Fotos de produto aceitam PNG, JPG/JPEG e WebP, com tamanho máximo de 5 MB.
- As fotos são armazenadas no bucket privado `imagens-produtos` do Supabase Storage. O PostgreSQL armazena somente o caminho controlado do objeto, nunca binário ou Base64.
- A permissão de imagem é determinada exclusivamente pela categoria. A coluna legada `produtos.permite_imagem` permanece apenas para compatibilidade e não é fonte de regra de negócio.
- Produtos podem ser ativados e inativados e usam exclusão lógica; excluídos não aparecem nas consultas comuns.
- O módulo exige a permissão `PRODUTO`. `GERENTE` possui acesso funcional total e os demais perfis precisam da permissão individual ativa.
- O backend recarrega perfil, atividade e permissões atuais do banco antes de autorizar cada requisição, de modo que concessões e revogações valem na requisição seguinte.

## Combos

- O nome é obrigatório e único entre combos não excluídos logicamente, ignorando maiúsculas, minúsculas e espaços nas extremidades. O nome pode ser reutilizado após a exclusão lógica do cadastro anterior.
- A descrição é opcional. O preço é definido livremente pelo usuário, pode ser zero e não pode ser negativo.
- Todo combo possui ao menos um produto. Um produto aparece no máximo uma vez por combo; uma nova seleção do mesmo produto deve atuar sobre a linha existente no frontend.
- Somente produtos ativos, não excluídos logicamente e operacionalmente válidos podem compor combos.
- A quantidade de cada produto é positiva e respeita o `multiploMinimo` vigente. Todas as regras são validadas novamente pelo backend.
- Combos podem ser ativados, inativados e excluídos logicamente. Excluídos não aparecem nas consultas administrativas comuns; inativos ou excluídos não podem ser incluídos em novos pedidos, mas permanecem identificáveis no histórico.
- Inativar ou excluir logicamente um produto inativa, na mesma transação, todos os combos não excluídos que o utilizam. Reativar o produto não reativa os combos relacionados.
- A reativação de combo é manual e revalida composição não vazia, produtos não repetidos, produtos ativos e não excluídos, quantidades positivas e múltiplos mínimos vigentes. Combo excluído não pode ser reativado pelo fluxo comum.
- Nome, descrição, preço e composição podem ser editados. Alterar efetivamente nome, preço ou composição incrementa a versão; alterar somente a descrição não incrementa.
- Atualizações idempotentes não incrementam versão. A comparação da composição considera produtos e quantidades independentemente da ordem recebida.
- Futuras vendas de combos preservarão uma fotografia histórica com nome, preço, versão, produtos e quantidades vendidos. Alterações posteriores nunca modificarão pedidos antigos.
- O histórico futuro distinguirá alteração posterior de nome, preço ou composição, inatividade e exclusão lógica. Alteração somente de descrição não indicará mudança histórica.
- A estrutura da fotografia histórica será definida e implementada com o módulo de Pedidos; nesta etapa o cadastro mantém uma versão persistida e referências restritivas, sem criar endpoints ou fluxos de Pedidos.
- O módulo exige a permissão `COMBOS`. `GERENTE` possui acesso funcional total e os demais perfis precisam da permissão individual ativa.
- O backend recarrega perfil, atividade e permissões atuais do banco antes de autorizar cada requisição, de modo que concessões, revogações e desativações valem na requisição seguinte.

## Fotos de referência dos pedidos

- Futuramente, cada item do pedido poderá possuir uma foto de referência, limitada a no máximo 10 itens com foto por pedido. Essa regra é independente da foto cadastral do produto e ainda não deve ser implementada nas tabelas ou fluxos de pedidos.

## Usuários e permissões

- As regras abaixo incluem a administração já integrada e a evolução confirmada em 03/09/2026. Cargos, exceções negativas e capacidades de ação ainda não estão implementados. Centralizar as regras e cobri-las por testes.
- Os perfis permanecem `ATENDENTE`, `ADMINISTRADOR` e `GERENTE`. “Funcionário” e “operador” não criam novos perfis; cargo configurável não substitui perfil de acesso.
- `GERENTE` possui acesso funcional total, independentemente de permissões individuais.
- Nenhum usuário pode editar um `GERENTE`, inclusive o próprio gerente.
- Gerente pode cadastrar funcionários com perfil `ATENDENTE`, `ADMINISTRADOR` ou `GERENTE`.
- No cadastro, quem cadastra (`GERENTE` ou `ADMINISTRADOR`) define a senha inicial do funcionário.
- Somente gerente pode alterar o `perfilAcesso` de um funcionário que não seja gerente.
- Gerente pode consultar e editar as permissões de atendentes e administradores.
- `ADMINISTRADOR` pode cadastrar somente funcionários com perfil `ATENDENTE`.
- Administrador pode consultar e editar as permissões de atendentes e de outros administradores.
- Administrador não pode editar a si próprio nem qualquer gerente.
- Atendente não administra funcionários ou permissões.
- O catálogo de telas confirmado é: `PEDIDOS`, `PRODUCAO`, `PRODUTO`, `COMBOS`, `RELATORIO`, `CLIENTE`, `ESTOQUE`, `EXPEDICAO` e `FUNCIONARIOS`. Na implementação existente, Clientes usa a chave `CLIENTES` (plural). São referências ao mesmo módulo, não duas permissões; nenhuma chave persistida ou contrato foi renomeado nesta revisão. A compatibilidade será tratada na proposta técnica.
- Produção e Expedição são permissões independentes de Pedidos. Novo pedido pertence a `PEDIDOS`.
- Todos os usuários internos ativos e autenticados acessam o Início. Não existe módulo independente `INICIO`.
- Não existe permissão `CONFIGURACOES`: o acesso a Configurações é exclusivo do perfil `GERENTE`.
- Ao cadastrar um novo funcionário, as permissões individuais concedidas por padrão são `CLIENTES` e `PEDIDOS`.
- A implementação atual administra apenas permissões individuais; a evolução aprovada combina cargo e exceções individuais conforme a subseção abaixo.
- Gerente e administrador podem consultar o catálogo administrativo de módulos; atendente não possui esse acesso.
- A listagem administrativa de funcionários inclui, por padrão, ativos e inativos que não estejam excluídos logicamente, podendo filtrar explicitamente pela atividade.
- Funcionários com `itemAtivo = false` ou `deletadoEm` preenchido não aparecem nas consultas administrativas comuns.
- Gerente e administrador podem consultar os dados e as permissões de funcionários ativos ou inativos, respeitando as restrições de edição por perfil.
- Permissões de atendentes e administradores inativos podem ser alteradas por quem possuir autoridade sobre o funcionário.
- Na API atual, a substituição de permissões aceita uma lista vazia para revogar todas as permissões individuais e deve ser atômica, idempotente e sem exclusão física. No modelo com cargos, o contrato precisará distinguir remoção de exceções individuais de negação explícita de permissões herdadas.
- Somente chaves do catálogo vigente podem ser concedidas. Consultas ignoram chaves desconhecidas sem apagá-las; uma substituição explícita desativa logicamente permissões ativas que não estejam no conjunto solicitado.
- Gerente pode alterar o perfil de atendentes e administradores ativos ou inativos. Repetir o perfil atual é uma operação idempotente.
- Alterar o perfil preserva as permissões individuais existentes. Ao promover para `GERENTE`, elas deixam de controlar o acesso, mas permanecem armazenadas; o gerente promovido torna-se imutável pelas regras vigentes.

### Cargos e exceções individuais — confirmados, ainda não implementados

- O sistema começa sem cargos cadastrados; somente gerente cria e altera cargos e suas permissões.
- Cargo fornece um conjunto de permissões básicas. Funcionário pode operar sem cargo, usando permissões individuais.
- Exceções individuais concedem ou retiram permissões e prevalecem sobre o cargo. Gerente permanece com acesso total, sem restrição por cargo ou exceção.
- Concessão de módulo não contorna restrições administrativas de perfil, como a proibição de atendente administrar funcionários ou de editar gerente.
- `podeCancelarPedido` é uma capacidade de ação adicional ao acesso a `PEDIDOS`, não uma tela ou módulo novo.
- Atendente não pode cancelar por padrão; administrador pode por padrão; gerente sempre pode. Cargo e configuração individual podem alterar essa capacidade para não gerentes, prevalecendo a individual.
- Ter somente `PEDIDOS` não basta para cancelar: também é necessária a capacidade efetiva de cancelamento. Esta regra substitui a resposta anterior de que todo usuário de Pedidos poderia cancelar.
- Limites de desconto e estorno são definidos por cargo e podem ser sobrescritos individualmente pelo gerente. A configuração individual prevalece. Valores iniciais e representação dos limites serão tratados na proposta de implementação, sem presumir acesso ilimitado.

`permissoes_funcionario` resolveu permissões individuais simples e já protege clientes. Não resolve cargos configuráveis, herança nem exceções negativas; o modelo combinado continua incompleto.

## Pedidos e auditoria

- Status: `RECEBIDO`, `EM_PRODUCAO`, `PRONTO`, `EM_ROTA`, `ENTREGUE` e `CANCELADO`.
- “Retirado” é o rótulo de `ENTREGUE` quando o tipo é `RETIRADA`, como no frontend; não é um novo status persistido.
- Por enquanto, usuários autorizados podem mudar livremente os status operacionais, inclusive saltar e retornar etapas. A decisão final substitui a lista preliminar de transições proibidas; não dispensa autorização no backend.
- Cancelar exige a capacidade definida acima. Motivo do cancelamento é opcional.
- Somente gerente reabre pedido entregue, retirado ou cancelado; a reabertura volta para `EM_PRODUCAO`. A liberdade de transições não contorna essa restrição.
- Cancelados permanecem no histórico e nos relatórios, mas não entram no faturamento.
- Auditoria preserva identificador do usuário e nome no momento da ação, exibindo somente o nome na interface. Não depender do nome cadastral atual para identificar o autor histórico.
- Registrar criação, edição, cancelamento, mudança de status, pagamento, estorno e autorização de desconto, com data/hora e ação; motivo quando aplicável. Edições registram campos alterados e valores anteriores/novos; mudanças de status registram anterior/novo.
- O pedido não deve perder o histórico ao ser cancelado, reaberto ou editado. A estrutura física da auditoria ainda exige proposta.

## Endereço de entrega

- Cliente mantém somente um endereço principal salvo.
- Endereço do pedido inicia com o principal do cliente, mas pode ser alterado somente para aquela venda, sem atualizar automaticamente o cadastro do cliente.
- Preservar no pedido o endereço efetivamente usado, independente de alterações posteriores no cliente.
- Campos estruturados: rua, número, bairro, complemento, ponto de referência, CEP, cidade e estado. O modelo existente ainda não contém todos esses campos nem a fotografia histórica no pedido.

## Pagamentos, estornos e relatórios

- O sistema apenas registra informações: não processa pagamentos nem integra bancos, adquirentes ou meios de pagamento. Registrar estorno não executa devolução financeira externa.
- Formas oficiais: débito, crédito e Pix. Um pedido admite vários pagamentos, formas diferentes e datas diferentes.
- Cada lançamento registra valor, forma, data/hora e usuário responsável. Situações dos lançamentos: `CONFIRMADO`, `REJEITADO` e `ESTORNADO`.
- Situação financeira geral do pedido: `PENDENTE`, `PARCIAL` ou `PAGO`, calculada sobre os valores confirmados, descontados os estornos; rejeitados não contam como recebimento.
- Para pedido de total positivo: valor líquido pago igual a zero resulta em `PENDENTE`; positivo inferior ao total resulta em `PARCIAL`; igual ou superior ao total resulta em `PAGO`. Tratamento de pedido de total zero e detalhes de arredondamento serão explicitados na proposta técnica.
- Estorno parcial mantém contabilizada a parcela não devolvida; não tratar o lançamento inteiro como devolvido ao registrar somente parte. A representação desse saldo será definida na proposta física.
- Cancelamento é status do pedido e não apaga pagamentos. Valores já recebidos são sinalizados para estorno manual e permanecem registrados até o estorno; não há devolução automática.
- Gerente configura limites de estorno por cargo e pode sobrescrevê-los por funcionário. Não é uma operação exclusiva do gerente: outros funcionários obedecem ao limite efetivo configurado.
- Estornos podem ser totais ou parciais. Gerente não possui limite administrativo, mas o acumulado estornado nunca pode ultrapassar o valor confirmado do pagamento; toda operação é auditada.
- Estorno recalcula a situação financeira do pedido. Devolução integral dos recebimentos de um pedido de total positivo resulta em `PENDENTE`, mesmo se o pedido estiver `CANCELADO`.
- Aceitar pagamento acima do total e registrar integralmente o valor informado. Não descartar o excedente nem convertê-lo automaticamente em troco ou crédito.
- Relatórios distinguem valor do pedido/faturamento, valor recebido, estornos e excedente. Pedido de R$ 100 com R$ 110 pagos representa R$ 100 de faturamento e R$ 110 recebidos, com R$ 10 de excedente; cancelados continuam excluídos do faturamento.

## Descontos

- Permitir percentual, valor fixo em reais ou ambos no mesmo pedido. Motivo é opcional.
- A ordem é escolhida no pedido: percentual antes do valor fixo ou valor fixo antes do percentual. Preservar a ordem e os valores aplicados no histórico.
- Limite por cargo com substituição individual por funcionário, configurável pelo gerente.
- Comparar o desconto efetivo total como porcentagem do subtotal: R$ 30 de desconto sobre R$ 200 equivalem a 15%, independentemente dos componentes usados.
- Desconto acima do limite exige autorização do gerente com a própria conta; a autorização vale apenas para aquele pedido, não concede permissão permanente.
- Auditar quem autorizou, limite original, desconto concedido e data/hora. Gerente mantém acesso funcional total.

## Capacidade

- Seguir o modelo de cálculo confirmado do frontend: unidades reais por categoria, agrupadas pela data e faixa de uma hora do horário agendado; combos são decompostos em produtos sem duplicar unidades por pacote.
- Produtos de uma mesma categoria têm o mesmo peso por unidade nesta etapa; não há ponderação por complexidade nem uma vaga igual por pedido.
- Limite configurável por categoria, igual em todos os dias e horários. Não há variação do limite por dia da semana ou data específica nesta versão. Categoria sem limite configurado não gera alerta.
- Horários de funcionamento variam por dia da semana; horários selecionáveis seguem o frontend, a cada 15 minutos. Isso é distinto do agrupamento de capacidade por hora.
- Exceder o limite gera somente aviso e permite continuar, inclusive para não gerentes. Não existe bloqueio nem autorização especial para exceder a capacidade.
- A decisão final substitui a regra anterior de rejeitar intervalo lotado e a autorização exclusiva de gerente. Portanto, não há evento obrigatório de “autorização de excesso” a auditar; criação/edição permanece auditada normalmente.
- Cancelamento libera imediatamente a capacidade contabilizada. Pedidos concluídos (`ENTREGUE`, incluindo retirada) saem da contagem conforme o modelo do frontend aprovado. Não copiar a falha atual que ainda conta cancelados em alguns cálculos.
- Limites são configurados pelo gerente, pelo acesso exclusivo a Configurações. A estrutura existente de `limites_horario` ainda não representa integralmente essa regra.

---

# Decisões Pendentes com a Doceria

Não implementar comportamento definitivo destes itens sem confirmação. Quando houver resposta, atualizar primeiro as regras confirmadas.

As perguntas discutidas sobre pedidos, cargos, permissões, pagamentos, descontos, endereço e capacidade foram consolidadas acima em 03/09/2026. Não reabrir essas decisões apenas porque o código ou o banco ainda usa o modelo antigo. Desenho físico, contratos, valores iniciais e migração continuam sujeitos à proposta técnica, sem autorização para alterar o banco nesta etapa documental.

## Estoque e produção

- Quando baixar estoque?
- Cancelamento sempre devolve itens?
- Estoque representa produtos, ingredientes ou ambos?
- Haverá controle de ingredientes?

Questões exclusivas de estoque podem aguardar o planejamento previsto para o próximo ano.

## Preparação da implementação

- Propor persistência para auditoria, cargos/exceções, capacidades, limites, pagamentos/estornos, endereço histórico, ordem dos descontos e capacidade por categoria.
- Definir compatibilidade entre `CLIENTE` (catálogo aprovado) e `CLIENTES` (chave existente), sem renomeação automática.
- Explicitar valores iniciais dos limites, unidade/escopo do limite de estorno, casos de total zero, arredondamento e contratos de atualização; não transformar ausência de configuração em concessão ilimitada por suposição.
- Planejar preservação dos pedidos existentes e fotografia histórica de combos conforme as regras já confirmadas.
- Proposta estrutural deve separar decisões técnicas de qualquer nova regra de negócio que necessite validação. Nenhuma tabela sugerida na conversa foi criada por esta revisão.

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
