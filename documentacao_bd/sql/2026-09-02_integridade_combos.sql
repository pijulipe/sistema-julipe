-- Integração e integridade do módulo de Combos
-- Data: 2026-09-02
-- Motivo: versionar alterações relevantes, impedir nomes e produtos repetidos,
-- preservar referências históricas e reproduzir garantias não expressáveis
-- integralmente pelo Prisma. Execute manualmente no banco após revisão.

BEGIN;

ALTER TABLE public.combos
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1;

ALTER TABLE public.combos
  DROP CONSTRAINT IF EXISTS ck_combos_versao_positiva;
ALTER TABLE public.combos
  ADD CONSTRAINT ck_combos_versao_positiva CHECK (versao > 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_combos_nome_ativo_normalizado
  ON public.combos (LOWER(TRIM(nome)))
  WHERE item_ativo = TRUE AND deletado_em IS NULL;

ALTER TABLE public.itens_combo
  DROP CONSTRAINT IF EXISTS uq_itens_combo_combo_produto;
ALTER TABLE public.itens_combo
  ADD CONSTRAINT uq_itens_combo_combo_produto UNIQUE (id_combo, id_produto);

ALTER TABLE public.itens_combo DROP CONSTRAINT IF EXISTS fk_itens_combo_combos;
ALTER TABLE public.itens_combo
  ADD CONSTRAINT fk_itens_combo_combos FOREIGN KEY (id_combo)
  REFERENCES public.combos(id_combo) ON DELETE RESTRICT;

ALTER TABLE public.itens_combo DROP CONSTRAINT IF EXISTS fk_itens_combo_produtos;
ALTER TABLE public.itens_combo
  ADD CONSTRAINT fk_itens_combo_produtos FOREIGN KEY (id_produto)
  REFERENCES public.produtos(id_produto) ON DELETE RESTRICT;

ALTER TABLE public.propriedades_pedido
  DROP CONSTRAINT IF EXISTS ck_propriedades_pedido_origem_exclusiva;
ALTER TABLE public.propriedades_pedido
  ADD CONSTRAINT ck_propriedades_pedido_origem_exclusiva
  CHECK ((id_produto IS NOT NULL) <> (id_combo IS NOT NULL));

ALTER TABLE public.propriedades_pedido DROP CONSTRAINT IF EXISTS fk_propriedades_pedido_produtos;
ALTER TABLE public.propriedades_pedido
  ADD CONSTRAINT fk_propriedades_pedido_produtos FOREIGN KEY (id_produto)
  REFERENCES public.produtos(id_produto) ON DELETE RESTRICT;

ALTER TABLE public.propriedades_pedido DROP CONSTRAINT IF EXISTS fk_propriedades_pedido_combos;
ALTER TABLE public.propriedades_pedido
  ADD CONSTRAINT fk_propriedades_pedido_combos FOREIGN KEY (id_combo)
  REFERENCES public.combos(id_combo) ON DELETE RESTRICT;

COMMIT;
