-- Complemento obrigatório da migração de Pedidos. Preparado; não aplicado remotamente.
ALTER TABLE versoes_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE estornos_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE operacoes_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE expediente_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacidade_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE alteracoes_catalogo_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ADD CONSTRAINT ck_pedido_fotografia_valida CHECK (
  fotografia IS NULL OR (versao_vigente > 0 AND revisao > 0 AND valor_total > 0
    AND jsonb_typeof(fotografia->'itens') = 'array' AND jsonb_array_length(fotografia->'itens') > 0)
);
ALTER TABLE pagamentos_pedido ADD CONSTRAINT ck_pagamento_valor CHECK (valor_centavos > 0),
  ADD CONSTRAINT ck_pagamento_forma CHECK (forma IN ('DEBITO','CREDITO','PIX')),
  ADD CONSTRAINT ck_pagamento_situacao CHECK (situacao IN ('CONFIRMADO','REJEITADO','ESTORNADO'));
ALTER TABLE estornos_pedido ADD CONSTRAINT ck_estorno_valor CHECK (valor_centavos > 0);
ALTER TABLE cargos ADD CONSTRAINT ck_cargo_limites CHECK (limite_desconto BETWEEN 0 AND 100 AND limite_estorno >= 0);
ALTER TABLE usuarios ADD CONSTRAINT ck_usuario_limites CHECK ((desconto_individual IS NULL OR desconto_individual BETWEEN 0 AND 100) AND (estorno_individual IS NULL OR estorno_individual >= 0));
ALTER TABLE expediente_pedidos ADD CONSTRAINT ck_expediente CHECK (dia_semana BETWEEN 0 AND 6 AND inicio ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$' AND fim ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$' AND inicio < fim);
ALTER TABLE capacidade_categorias ADD CONSTRAINT ck_capacidade CHECK (limite >= 0),
  ADD CONSTRAINT fk_capacidade_categoria FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE RESTRICT;
CREATE INDEX idx_pedidos_data_status ON pedidos(data_entrega_agendada, status_pedido, id_pedido);

CREATE FUNCTION enfileirar_catalogo_pedidos() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'produtos' THEN
    INSERT INTO alteracoes_catalogo_pedidos(entidade,id_cadastro) VALUES ('PRODUTO',COALESCE(NEW.id_produto,OLD.id_produto));
  ELSE
    INSERT INTO alteracoes_catalogo_pedidos(entidade,id_cadastro) VALUES ('COMBO',COALESCE(NEW.id_combo,OLD.id_combo));
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER produtos_fila_pedidos AFTER UPDATE OR DELETE ON produtos FOR EACH ROW EXECUTE FUNCTION enfileirar_catalogo_pedidos();
CREATE TRIGGER combos_fila_pedidos AFTER UPDATE OR DELETE ON combos FOR EACH ROW EXECUTE FUNCTION enfileirar_catalogo_pedidos();
CREATE TRIGGER composicao_fila_pedidos AFTER INSERT OR UPDATE OR DELETE ON itens_combo FOR EACH ROW EXECUTE FUNCTION enfileirar_catalogo_pedidos();

-- Defesa adicional contra estorno concorrente mesmo fora da API.
CREATE FUNCTION validar_saldo_estorno_pedido() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE recebido bigint; devolvido bigint; estado text;
BEGIN
  SELECT valor_centavos,situacao INTO recebido,estado FROM pagamentos_pedido WHERE id_pagamento=NEW.id_pagamento FOR UPDATE;
  SELECT COALESCE(SUM(valor_centavos),0) INTO devolvido FROM estornos_pedido WHERE id_pagamento=NEW.id_pagamento;
  IF estado <> 'CONFIRMADO' OR devolvido + NEW.valor_centavos > recebido THEN
    RAISE EXCEPTION 'Estorno incompatível com saldo do pagamento';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER saldo_estorno_pedido BEFORE INSERT ON estornos_pedido FOR EACH ROW EXECUTE FUNCTION validar_saldo_estorno_pedido();

-- Expediente não é inferido do protótipo: gerente configura antes do primeiro agendamento.
-- Não inserir pagamentos, fotografias, endereços ou composição histórica para registros legados.
