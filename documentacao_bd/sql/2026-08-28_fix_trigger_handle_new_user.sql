-- Correção do gatilho handle_new_user: não deve mais inserir automaticamente
-- em public.usuarios quando o usuário foi criado pela nossa API administrativa
-- (POST /api/funcionarios), pois essa rota já insere a linha com o perfil correto.
-- Sem essa correção, o gatilho sempre sobrescrevia o perfil escolhido para ATENDENTE.
-- Data: 2026-08-28

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'criado_por_admin')::boolean IS TRUE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.usuarios (id_usuario, nome, email, perfil_acesso)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    'ATENDENTE'::perfil_acesso_enum
  )
  ON CONFLICT (id_usuario) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;
