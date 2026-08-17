# Métodos de Acesso e Integração Backend - Doceria Julipe (Supabase & PostgreSQL)

**Projeto:** Sistema de Gerenciamento Operacional - Doceria Julipe  

---

## 1. Visão Geral dos Métodos de Acesso

O banco de dados PostgreSQL hospedado no Supabase oferece **3 métodos principais de acesso**, cada um voltado para uma camada diferente da arquitetura da aplicação:

```
+-------------------------------------------------------------------------+
|                         CAMADAS DE ACESSO                              |
+-------------------------------------------------------------------------+
|  1. Client SDK (@supabase/supabase-js)  -> Frontend Web / Node.js       |
|     (Autenticado via JWT + Sincronização Automática por Trigger)       |
+-------------------------------------------------------------------------+
|  2. Conexão Direta PostgreSQL (Driver/ORM) -> Backend Node.js / Python     |
|     (Porta 5432 Direct ou 6543 Connection Pooler)                      |
+-------------------------------------------------------------------------+
|  3. Service Role Key (Chave Mestra)      -> Tasks Admin / Servidor     |
|     (Bypassa RLS - NUNCA expor no Frontend)                             |
+-------------------------------------------------------------------------+
```

---

## 2. Método 1: Acesso e Cadastro via Supabase Client SDK (`@supabase/supabase-js`)

Este é o método padrão recomendado para a aplicação web da Doceria Julipe. A comunicação ocorre via chamadas HTTPS seguras tratadas pelo motor PostgREST e Supabase Auth.

### A. Inicialização do Cliente Supabase

```javascript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'SUA_URL_SUPABASE'
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

---

### B. Fluxo Completo de Cadastro de Usuário (com Trigger Automático)

Ao cadastrar um funcionário via `supabase.auth.signUp()`, enviamos o nome completo e o perfil desejado dentro do objeto `options.data`. Esses dados são gravados no campo `raw_user_meta_data` do Supabase Auth e capturados instantaneamente pelo **Trigger PostgreSQL (`on_auth_user_created`)**, alimentando a tabela `public.usuarios` automaticamente.

```javascript
/**
 * Realiza o cadastro de um novo funcionário/usuário no sistema.
 * 
 * @param {string} email - E-mail do usuário.
 * @param {string} password - Senha de acesso.
 * @param {string} fullName - Nome completo do funcionário.
 * @param {string} perfilAcesso - Perfil ('ADMINISTRADOR', 'GERENTE', 'ATENDENTE').
 */
async function signUpUser(email, password, fullName, perfilAcesso = 'ATENDENTE') {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: fullName, // Salvo em raw_user_meta_data e capturado pelo Trigger
        perfil_acesso: perfilAcesso
      }
    }
  })

  if (error) {
    console.error('Erro no cadastro:', error.message)
    return { success: false, error: error.message }
  }

  console.log('Usuário cadastrado com sucesso:', data.user)
  return { success: true, user: data.user }
}
```

---

### C. Fluxo de Login e Obtenção do Perfil

```javascript
// 1. Realizar Login do Atendente
async function signInUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  })

  if (error) {
    console.error('Erro no login:', error.message)
    return null
  }

  console.log('Login efetuado:', data.user.email)
  return data
}

// 2. Buscar Perfil do Usuário Autenticado na Tabela Public.Usuarios
async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id_usuario', user.id)
    .single()

  if (error) console.error('Erro ao buscar perfil:', error.message)
  return data
}
```

---

### D. Operações do Sistema Respeitando o RLS (Ex: Buscar e Criar Pedidos)

```javascript
// Buscar Pedidos (RLS garante leitura apenas para equipe autenticada)
async function buscarPedidos() {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`
      id_pedido,
      codigo_comanda,
      tipo_entrega,
      status_pedido,
      valor_total,
      clientes ( nome, telefone )
    `)
    .order('data_pedido', { ascending: false })

  if (error) console.error('Erro ao buscar pedidos:', error.message)
  return data
}
```

---

## 3. Método 2: Acesso Direto PostgreSQL (Driver TCP / ORM / DBeaver)

Utilizado por ferramentas de administração de banco de dados (DBeaver, pgAdmin) ou por servidores backend usando ORMs (Prisma, TypeORM, Drizzle, `pg`).

### Strings de Conexão:

#### A. Conexão Direta (Porta 5432)
```text
postgresql://postgres.[REF_PROJETO]:[SUA_SENHA]@db.[REF_PROJETO].supabase.co:5432/postgres
```

#### B. Connection Pooler - Supavisor (Porta 6543)
```text
postgresql://postgres.[REF_PROJETO]:[SUA_SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## 4. Método 3: Acesso com Chave Admin (`service_role`)

Chave com **privilégios de superusuário** que ignora (*bypassa*) todas as regras de RLS.

### Regra de Ouro de Segurança:
> ⚠️ **NUNCA** inclua a `service_role_key` no código do frontend (React/Vite), repositório Git ou arquivos do cliente. Ela deve existir apenas no arquivo `.env` seguro do servidor backend.

```javascript
// Exemplo EXCLUSIVO para Servidor Backend
const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Ignora RLS
)
```

---

## 5. Resumo das Recomendações de Acesso

| Ambiente | Método Recomendado | Nível de Segurança | RLS Ativo? |
| :--- | :--- | :--- | :--- |
| **Frontend React (Navegador)** | Supabase Client (`@supabase/supabase-js` + `anon_key`) | 🟢 Máxima (JWT + RLS) | **SIM** |
| **Painéis Administrativos (DBeaver/pgAdmin)** | Conexão Direta TCP (`postgres` user) | 🟡 Protegido por Senha Forte | NÃO (Bypassa RLS) |
| **Backend Node.js / Microserviços** | Connection Pooler (Porta 6543) ou `service_role` | 🟢 Variável de Ambiente (`.env`) | Depende do token usado |
