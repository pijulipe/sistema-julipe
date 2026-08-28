-- Correção de RLS: limites_horario
-- Data: 2026-08-28
-- Motivo: as políticas anteriores ("Permitir acesso total a limites_horario" e
-- "Permitir leitura e escrita em limites_horario") concediam INSERT/UPDATE/DELETE
-- para qualquer usuário autenticado, incluindo ATENDENTE.
-- Regra de negócio confirmada: leitura liberada para toda a equipe autenticada;
-- criação, alteração e exclusão restritas a GERENTE.

DROP POLICY IF EXISTS "Permitir acesso total a limites_horario" ON public.limites_horario;
DROP POLICY IF EXISTS "Permitir leitura e escrita em limites_horario" ON public.limites_horario;

CREATE POLICY "Leitura de limites_horario liberada para a equipe" ON public.limites_horario
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Apenas gerente cria limites_horario" ON public.limites_horario
    FOR INSERT TO authenticated
    WITH CHECK (public.current_user_perfil() = 'GERENTE');

CREATE POLICY "Apenas gerente altera limites_horario" ON public.limites_horario
    FOR UPDATE TO authenticated
    USING (public.current_user_perfil() = 'GERENTE')
    WITH CHECK (public.current_user_perfil() = 'GERENTE');

CREATE POLICY "Apenas gerente exclui limites_horario" ON public.limites_horario
    FOR DELETE TO authenticated
    USING (public.current_user_perfil() = 'GERENTE');
