-- PROPOSTA PARA APROVAÇÃO. Não executar automaticamente.
-- Backend precisa de conexão com papel privilegiado; authenticated não deve acessar diretamente.
DO $$ DECLARE tabela text; BEGIN
  FOREACH tabela IN ARRAY ARRAY['versoes_pedido','pagamentos_pedido','estornos_pedido','eventos_pedido','operacoes_pedido','cargos','expediente_pedidos','capacidade_categorias','alteracoes_catalogo_pedidos','fotos_pedido'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tabela);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',tabela);
  END LOOP;
END $$;
-- Tabelas legadas têm políticas permissivas: revogar privilégios impede contorno da API,
-- preservando as políticas para inspeção/recuperação. Revisar consumidores antes de aplicar.
REVOKE ALL ON public.pedidos,public.propriedades_pedido,public.usuarios,public.permissoes_funcionario FROM anon,authenticated;
REVOKE ALL ON public.produtos,public.combos,public.itens_combo,public.clientes,public.categorias FROM anon,authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('referencias-pedidos','referencias-pedidos',false,5242880,ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false, file_size_limit=5242880, allowed_mime_types=EXCLUDED.allowed_mime_types;
-- Não criar políticas gerais de Storage; usar assinaturas emitidas pela API.
