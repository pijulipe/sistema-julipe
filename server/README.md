# Backend JULIPE

API REST em Node.js, Express, Prisma e PostgreSQL.

## Configuração

1. Copie `.env.example` para `.env` e preencha `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL` e `SUPABASE_JWT_SECRET`.
2. Instale as dependências com `npm install`.
3. Gere o Prisma Client com `npm run prisma:gerar`.
4. Valide o schema com `npm run prisma:validar`.
5. Inicie em desenvolvimento com `npm run dev`.

O `schema.sql` na raiz continua sendo a referência de criação do banco. O schema Prisma mapeia a tabela existente de clientes e não cria uma regra de unicidade para telefone.

## Autorização

Todas as rotas de clientes exigem `Authorization: Bearer <token>`. O JWT HS256, assinado pelo backend, deve conter:

```json
{
  "sub": "id-do-usuario",
  "perfilAcesso": "GERENTE",
  "permissoes": ["CLIENTES"]
}
```

Gerentes acessam o módulo por hierarquia. Outros funcionários precisam da permissão `CLIENTES` na implementação atual. O modelo de cargos e exceções individuais foi confirmado em 03/09/2026, mas ainda não foi implementado. Consulte o [AGENTS.md](../AGENTS.md) e a [consolidação documental](../documentacao_bd/07_decisoes_confirmadas_2026-09-03.md); a referência de negócio `CLIENTE` não renomeia automaticamente a chave existente `CLIENTES`.

## Rotas de clientes

- `POST /api/clientes` — cadastra.
- `GET /api/clientes?busca=&pagina=1&limite=20` — lista e pesquisa por nome, telefone ou bairro.
- `GET /api/clientes/:id` — consulta um cadastro.
- `PUT /api/clientes/:id` — substitui os dados editáveis.
- `PATCH /api/clientes/:id` — altera campos informados.
- `DELETE /api/clientes/:id` — realiza exclusão lógica.

Campos aceitos: `nome`, `telefone`, `endereco`, `numeroEndereco`, `bairro`, `pontoReferencia`, `observacoes` e `dataAniversario` (`AAAA-MM-DD`). Nome e telefone são obrigatórios na criação e substituição.

Execute os testes com `npm test`.

Teste a conexão configurada no `.env`, sem alterar dados, com `npm run banco:testar`.
