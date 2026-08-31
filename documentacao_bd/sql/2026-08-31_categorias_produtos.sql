-- Carga inicial idempotente das categorias fixas de produtos
-- Data: 2026-08-31
-- Motivo: disponibilizar na API as seis categorias confirmadas para a primeira versão.
-- O script não depende de identificadores numéricos e não altera valores já
-- existentes, preservando eventuais configurações confirmadas no banco.

INSERT INTO public.categorias (
    nome_categoria,
    unidades_por_pacote_padrao,
    permite_imagem,
    ativo,
    item_ativo
)
SELECT dados.nome_categoria, dados.unidades_por_pacote_padrao,
       dados.permite_imagem, TRUE, TRUE
FROM (VALUES
    ('Bolos', 1, TRUE),
    ('Doces', 1, TRUE),
    ('Salgados', 25, FALSE),
    ('Bebidas', 1, FALSE),
    ('Congelados', 1, FALSE),
    ('Festas', 1, FALSE)
) AS dados(nome_categoria, unidades_por_pacote_padrao, permite_imagem)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.categorias categoria
    WHERE LOWER(TRIM(categoria.nome_categoria)) = LOWER(dados.nome_categoria)
      AND categoria.deletado_em IS NULL
);
