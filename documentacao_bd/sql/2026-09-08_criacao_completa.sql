-- Criação local completa para banco vazio. Não executar em banco existente.
-- Políticas Supabase e bucket: arquivo separado sujeito a aprovação.
-- Tipo enumerado
CREATE TYPE "peixe_status_cor_enum" AS ENUM ('NEMO', 'DORI', 'NENHUM');

-- Tipo enumerado
CREATE TYPE "perfil_acesso_enum" AS ENUM ('ADMINISTRADOR', 'GERENTE', 'ATENDENTE');

-- Tipo enumerado
CREATE TYPE "status_pagamento_enum" AS ENUM ('PENDENTE', 'PAGO', 'PARCIAL', 'REJEITADO', 'ESTORNADO', 'CANCELADO');

-- Tipo enumerado
CREATE TYPE "status_pedido_enum" AS ENUM ('RECEBIDO', 'EM_PRODUCAO', 'PRONTO', 'EM_ROTA', 'ENTREGUE', 'CANCELADO');

-- Tipo enumerado
CREATE TYPE "tipo_entrega_enum" AS ENUM ('ENTREGA', 'RETIRADA', 'CONSUMO_LOCAL');

CREATE TABLE public.categorias (
  id_categoria integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome_categoria character varying NOT NULL,
  descricao text,
  unidades_por_pacote_padrao integer NOT NULL DEFAULT 1,
  permite_imagem boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria)
);
CREATE TABLE public.clientes (
  id_cliente bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL,
  telefone character varying NOT NULL,
  endereco character varying,
  numero_endereco character varying,
  bairro character varying,
  ponto_referencia character varying,
  observacoes text,
  data_aniversario date,
  data_cadastro timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT clientes_pkey PRIMARY KEY (id_cliente)
);
CREATE TABLE public.usuarios (
  id_usuario uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  perfil_acesso perfil_acesso_enum NOT NULL DEFAULT 'ATENDENTE'::perfil_acesso_enum,
  ativo boolean NOT NULL DEFAULT true,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  id_autenticacao_supabase uuid NOT NULL UNIQUE,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario)
);
CREATE TABLE public.limites_horario (
  id_limite_horario integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  data date NOT NULL,
  horario_inicio timestamp with time zone NOT NULL,
  horario_fim timestamp with time zone NOT NULL,
  limite_pedidos integer NOT NULL DEFAULT 0,
  pedidos_agendados integer NOT NULL DEFAULT 0,
  bloqueado boolean NOT NULL DEFAULT false,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT limites_horario_pkey PRIMARY KEY (id_limite_horario)
);
CREATE TABLE public.entregadores (
  id_entregador integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL,
  telefone character varying,
  veiculo character varying,
  placa character varying,
  ativo boolean NOT NULL DEFAULT true,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT entregadores_pkey PRIMARY KEY (id_entregador)
);
CREATE TABLE public.acessorios (
  id_acessorio integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL,
  preco_padrao numeric NOT NULL DEFAULT 0.00 CHECK (preco_padrao >= 0::numeric),
  estoque_atual integer NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
  ativo boolean NOT NULL DEFAULT true,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT acessorios_pkey PRIMARY KEY (id_acessorio)
);
CREATE TABLE public.combos (
  id_combo integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL,
  descricao text,
  preco numeric NOT NULL CHECK (preco >= 0::numeric),
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0),
  ativo boolean NOT NULL DEFAULT true,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT combos_pkey PRIMARY KEY (id_combo)
);
CREATE TABLE public.configuracoes_sistema (
  id_configuracao integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  chave character varying NOT NULL UNIQUE,
  valor_json jsonb NOT NULL,
  descricao text,
  atualizado_em timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT configuracoes_sistema_pkey PRIMARY KEY (id_configuracao)
);
CREATE TABLE public.produtos (
  id_produto integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_categoria integer NOT NULL,
  nome character varying NOT NULL,
  descricao text,
  preco_unitario numeric NOT NULL CHECK (preco_unitario >= 0::numeric),
  unidade_medida character varying NOT NULL DEFAULT 'Unidade'::character varying,
  multiplo_minimo integer NOT NULL DEFAULT 1 CHECK (multiplo_minimo > 0),
  tempo_preparo_minutos integer NOT NULL DEFAULT 0 CHECK (tempo_preparo_minutos >= 0),
  url_imagem text,
  permite_imagem boolean NOT NULL DEFAULT false,
  estoque_atual numeric NOT NULL DEFAULT 0.00,
  estoque_critico numeric NOT NULL DEFAULT 5.00,
  ativo boolean NOT NULL DEFAULT true,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT produtos_pkey PRIMARY KEY (id_produto),
  CONSTRAINT fk_produtos_categorias FOREIGN KEY (id_categoria) REFERENCES public.categorias(id_categoria)
);
CREATE TABLE public.itens_combo (
  id_item_combo integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_combo integer NOT NULL,
  id_produto integer NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1.000 CHECK (quantidade > 0::numeric),
  CONSTRAINT itens_combo_pkey PRIMARY KEY (id_item_combo),
  CONSTRAINT uq_itens_combo_combo_produto UNIQUE (id_combo, id_produto),
  CONSTRAINT fk_itens_combo_combos FOREIGN KEY (id_combo) REFERENCES public.combos(id_combo) ON DELETE RESTRICT,
  CONSTRAINT fk_itens_combo_produtos FOREIGN KEY (id_produto) REFERENCES public.produtos(id_produto) ON DELETE RESTRICT
);
CREATE TABLE public.pedidos (
  id_pedido bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  codigo_comanda character varying,
  id_cliente bigint,
  id_usuario_atendente uuid,
  id_limite_horario integer,
  id_entregador integer,
  tipo_entrega tipo_entrega_enum NOT NULL,
  data_pedido timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_entrega_agendada date,
  horario_entrega_agendada time without time zone,
  status_pedido status_pedido_enum NOT NULL DEFAULT 'RECEBIDO'::status_pedido_enum,
  status_pagamento status_pagamento_enum NOT NULL DEFAULT 'PENDENTE'::status_pagamento_enum,
  valor_subtotal numeric NOT NULL DEFAULT 0.00 CHECK (valor_subtotal >= 0::numeric),
  taxa_entrega numeric NOT NULL DEFAULT 0.00 CHECK (taxa_entrega >= 0::numeric),
  desconto_percentual numeric NOT NULL DEFAULT 0.00 CHECK (desconto_percentual >= 0::numeric AND desconto_percentual <= 100::numeric),
  valor_desconto numeric NOT NULL DEFAULT 0.00 CHECK (valor_desconto >= 0::numeric),
  valor_total numeric NOT NULL DEFAULT 0.00 CHECK (valor_total >= 0::numeric),
  forma_pagamento character varying,
  peixe_status_cor peixe_status_cor_enum NOT NULL DEFAULT 'NENHUM'::peixe_status_cor_enum,
  estoque_baixado boolean NOT NULL DEFAULT false,
  foto_referencia_url text,
  observacoes_pedido text,
  detalhes_personalizacao text,
  motivo_cancelamento text,
  cancelado_em timestamp with time zone,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id_pedido),
  CONSTRAINT fk_pedidos_clientes FOREIGN KEY (id_cliente) REFERENCES public.clientes(id_cliente),
  CONSTRAINT fk_pedidos_usuarios FOREIGN KEY (id_usuario_atendente) REFERENCES public.usuarios(id_usuario),
  CONSTRAINT fk_pedidos_limites_horario FOREIGN KEY (id_limite_horario) REFERENCES public.limites_horario(id_limite_horario),
  CONSTRAINT fk_pedidos_entregadores FOREIGN KEY (id_entregador) REFERENCES public.entregadores(id_entregador)
);
CREATE TABLE public.propriedades_pedido (
  id_item_pedido bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_pedido bigint NOT NULL,
  id_produto integer,
  id_combo integer,
  quantidade numeric NOT NULL CHECK (quantidade > 0::numeric),
  preco_unitario numeric NOT NULL CHECK (preco_unitario >= 0::numeric),
  subtotal numeric NOT NULL CHECK (subtotal >= 0::numeric),
  massa_escolhida character varying,
  recheio_escolhido character varying,
  cobertura_escolhida character varying,
  escrita_personalizada character varying,
  observacoes_item text,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT propriedades_pedido_pkey PRIMARY KEY (id_item_pedido),
  CONSTRAINT fk_propriedades_pedido_pedidos FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id_pedido),
  CONSTRAINT ck_propriedades_pedido_origem_exclusiva CHECK ((id_produto IS NOT NULL) <> (id_combo IS NOT NULL)),
  CONSTRAINT fk_propriedades_pedido_produtos FOREIGN KEY (id_produto) REFERENCES public.produtos(id_produto) ON DELETE RESTRICT,
  CONSTRAINT fk_propriedades_pedido_combos FOREIGN KEY (id_combo) REFERENCES public.combos(id_combo) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_combos_nome_ativo_normalizado
  ON public.combos (LOWER(TRIM(nome)))
  WHERE item_ativo = TRUE AND deletado_em IS NULL;
CREATE TABLE public.acessorios_pedido (
  id_acessorio_pedido integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_pedido bigint NOT NULL,
  id_acessorio integer NOT NULL,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario numeric NOT NULL CHECK (preco_unitario >= 0::numeric),
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT acessorios_pedido_pkey PRIMARY KEY (id_acessorio_pedido),
  CONSTRAINT fk_acessorios_pedido_pedidos FOREIGN KEY (id_pedido) REFERENCES public.pedidos(id_pedido),
  CONSTRAINT fk_acessorios_pedido_acessorios FOREIGN KEY (id_acessorio) REFERENCES public.acessorios(id_acessorio)
);
CREATE TABLE public.permissoes_funcionario (
  id_permissao integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_usuario uuid NOT NULL,
  modulo character varying NOT NULL,
  item_ativo boolean NOT NULL DEFAULT true,
  deletado_em timestamp with time zone,
  CONSTRAINT permissoes_funcionario_pkey PRIMARY KEY (id_permissao),
  CONSTRAINT fk_permissoes_usuarios FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario)
);

-- Evolução local de Pedidos; execução remota depende de aprovação.
-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "assinatura_catalogo" TEXT,
ADD COLUMN     "fotografia" JSONB,
ADD COLUMN     "pendencia" JSONB,
ADD COLUMN     "revisao" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "versao_vigente" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "cancelamento_individual" BOOLEAN,
ADD COLUMN     "desconto_individual" DECIMAL(5,2),
ADD COLUMN     "estorno_individual" DECIMAL(12,2),
ADD COLUMN     "excecoes_modulos" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "id_cargo" INTEGER;

-- CreateTable
CREATE TABLE "versoes_pedido" (
    "id_pedido" BIGINT NOT NULL,
    "versao" INTEGER NOT NULL,
    "fotografia" JSONB NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versoes_pedido_pkey" PRIMARY KEY ("id_pedido","versao")
);

-- CreateTable
CREATE TABLE "pagamentos_pedido" (
    "id_pagamento" UUID NOT NULL,
    "id_pedido" BIGINT NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "forma" VARCHAR(10) NOT NULL,
    "situacao" VARCHAR(12) NOT NULL,
    "realizado_em" TIMESTAMPTZ(6) NOT NULL,
    "id_autor" UUID NOT NULL,
    "nome_autor" TEXT NOT NULL,

    CONSTRAINT "pagamentos_pedido_pkey" PRIMARY KEY ("id_pagamento")
);

-- CreateTable
CREATE TABLE "estornos_pedido" (
    "id_estorno" UUID NOT NULL,
    "id_pagamento" UUID NOT NULL,
    "valor_centavos" BIGINT NOT NULL,
    "realizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_autor" UUID NOT NULL,
    "nome_autor" TEXT NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "estornos_pedido_pkey" PRIMARY KEY ("id_estorno")
);

-- CreateTable
CREATE TABLE "eventos_pedido" (
    "id_evento" BIGSERIAL NOT NULL,
    "id_pedido" BIGINT NOT NULL,
    "versao" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "id_autor" UUID,
    "nome_autor" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pedido_pkey" PRIMARY KEY ("id_evento")
);

-- CreateTable
CREATE TABLE "operacoes_pedido" (
    "chave" TEXT NOT NULL,
    "assinatura" TEXT NOT NULL,
    "resposta" JSONB NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operacoes_pedido_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id_cargo" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "modulos" TEXT[],
    "pode_cancelar_pedido" BOOLEAN,
    "limite_desconto" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "limite_estorno" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id_cargo")
);

-- CreateTable
CREATE TABLE "expediente_pedidos" (
    "dia_semana" INTEGER NOT NULL,
    "aberto" BOOLEAN NOT NULL,
    "inicio" VARCHAR(5) NOT NULL,
    "fim" VARCHAR(5) NOT NULL,

    CONSTRAINT "expediente_pedidos_pkey" PRIMARY KEY ("dia_semana")
);

-- CreateTable
CREATE TABLE "capacidade_categorias" (
    "id_categoria" INTEGER NOT NULL,
    "limite" INTEGER NOT NULL,

    CONSTRAINT "capacidade_categorias_pkey" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "alteracoes_catalogo_pedidos" (
    "ultimo_pedido" BIGINT NOT NULL DEFAULT 0,
    "id_alteracao" BIGSERIAL NOT NULL,
    "entidade" TEXT NOT NULL,
    "id_cadastro" INTEGER NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alteracoes_catalogo_pedidos_pkey" PRIMARY KEY ("id_alteracao")
);

-- CreateTable
CREATE TABLE "fotos_pedido" (
    "caminho" TEXT NOT NULL,
    "id_autor" UUID NOT NULL,
    "confirmada" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_pedido_pkey" PRIMARY KEY ("caminho")
);

-- CreateIndex
CREATE INDEX "pagamentos_pedido_id_pedido_idx" ON "pagamentos_pedido"("id_pedido");

-- CreateIndex
CREATE INDEX "estornos_pedido_id_pagamento_idx" ON "estornos_pedido"("id_pagamento");

-- CreateIndex
CREATE INDEX "eventos_pedido_id_pedido_id_evento_idx" ON "eventos_pedido"("id_pedido", "id_evento");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_nome_key" ON "cargos"("nome");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_id_cargo_fkey" FOREIGN KEY ("id_cargo") REFERENCES "cargos"("id_cargo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versoes_pedido" ADD CONSTRAINT "versoes_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_pedido" ADD CONSTRAINT "pagamentos_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estornos_pedido" ADD CONSTRAINT "estornos_pedido_id_pagamento_fkey" FOREIGN KEY ("id_pagamento") REFERENCES "pagamentos_pedido"("id_pagamento") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_pedido" ADD CONSTRAINT "eventos_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE RESTRICT ON UPDATE CASCADE;

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
