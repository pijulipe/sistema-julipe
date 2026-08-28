# Guia de Segurança e Implantação no Supabase - Doceria Julipe

**Projeto:** Sistema de Gerenciamento Operacional - Doceria Julipe  
**Foco:** Hardening de Segurança: Prevenção contra Injeção de Schema, Privilege Escalation e RLS Granular  

---

## 1. Visão Geral da Arquitetura de Segurança Hardened

O **Supabase** expõe automaticamente todas as tabelas do PostgreSQL através de APIs REST (`PostgREST`) e GraphQL. Se a camada de segurança não for rigorosamente configurada, atacantes podem tentar explorar injeção de schema via funções `SECURITY DEFINER` ou elevar seus próprios privilégios passando perfis de acesso elevados (`ADMINISTRADOR`) na requisição de cadastro.

Para proteger a **Doceria Julipe** contra esses vetores de ataque, o banco de dados foi atualizado com 3 camadas de proteção avançada.

---

## 2. Principais Implementações de Segurança Realizadas

### A. Proteção Contra Elevação de Privilégios (Privilege Escalation)
No cadastro público via API (`signUp`), o atributo `perfil_acesso` foi removido do fallback. Todos os novos cadastros entram **estritamente com o perfil `'ATENDENTE'`**. Promover um usuário para `GERENTE` ou `ADMINISTRADOR` exige alteração manual posterior realizada por um administrador autenticado.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Previne Schema Search Path Hijacking
AS $$
BEGIN
  -- Contas criadas pela API administrativa (POST /api/funcionarios) já
  -- inserem a linha em usuarios com o perfil correto; o gatilho não deve
  -- sobrescrever isso. Ver documentacao_bd/sql/2026-08-28_fix_trigger_handle_new_user.sql
  IF (NEW.raw_user_meta_data->>'criado_por_admin')::boolean IS TRUE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.usuarios (id_usuario, nome, email, perfil_acesso)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    'ATENDENTE'::perfil_acesso_enum -- Perfil estritamente travado
  )
  ON CONFLICT (id_usuario) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;
```

---

### B. Prevenção Contra Injeção de Schema (`SET search_path = public`)
Funções executadas com privilégios `SECURITY DEFINER` rodam com os direitos de superusuário do banco. Sem a trava explícita de `SET search_path = public`, um atacante poderia criar tabelas temporárias em schemas maliciosos para redirecionar a execução da função.

Adicionamos a propriedade `SET search_path = public` tanto em `handle_new_user()` quanto em `current_user_perfil()`.

---

### C. Políticas RLS Granulares por Perfil (Role-Based Access Control - RBAC)

1. **`configuracoes_sistema` (Restrito Estritamente a Administradores)**:
   - Leitura: Permitida para toda a equipe autenticada.
   - Modificação: **Exclusiva para `ADMINISTRADOR`**.
   ```sql
   CREATE POLICY "Apenas admins alteram configuracoes" ON public.configuracoes_sistema
       FOR ALL TO authenticated 
       USING (public.current_user_perfil() = 'ADMINISTRADOR')
       WITH CHECK (public.current_user_perfil() = 'ADMINISTRADOR');
   ```

2. **Catálogo de Produtos, Categorias e Combos**:
   - Leitura: Liberada para a equipe.
   - Alteração de Preços/Cadastro: **Exclusiva para `ADMINISTRADOR` e `GERENTE`**.

3. **Operação Diária (Pedidos, Clientes e Entregadores)**:
   - Leitura e Escrita liberadas para a equipe autenticada (`ATENDENTE`, `GERENTE`, `ADMINISTRADOR`).

---

## 3. Passo a Passo para Implantação no Dashboard do Supabase

1. Acesse o painel do seu projeto no **Supabase** (`https://supabase.com/dashboard`).
2. No menu lateral, navegue até a seção **SQL Editor**.
3. Clique em **New Query**.
4. Copie todo o conteúdo do arquivo [`schema.sql`](../schema.sql) e cole no editor.
5. Clique no botão **Run** no canto inferior direito.
6. Vá na aba **Authentication** $\rightarrow$ **Policies** e confirme que o RLS está ativo com as políticas protegidas.
