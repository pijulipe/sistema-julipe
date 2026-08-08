# Backend JULIPE

API REST em Node.js, Express, Prisma e PostgreSQL.

## Configuração

1. Copie `.env.example` para `.env` e preencha `DATABASE_URL` e `JWT_SECRET`.
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

Gerentes acessam o módulo por hierarquia. Outros funcionários precisam da permissão `CLIENTES`. A origem dessas permissões será integrada ao modelo definitivo de usuários e cargos quando ele for decidido.

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
