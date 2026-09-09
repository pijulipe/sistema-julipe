-- CreateEnum
CREATE TYPE "peixe_status_cor_enum" AS ENUM ('NEMO', 'DORI', 'NENHUM');

-- CreateEnum
CREATE TYPE "perfil_acesso_enum" AS ENUM ('ADMINISTRADOR', 'GERENTE', 'ATENDENTE');

-- CreateEnum
CREATE TYPE "status_pagamento_enum" AS ENUM ('PENDENTE', 'PAGO', 'PARCIAL', 'REJEITADO', 'ESTORNADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "status_pedido_enum" AS ENUM ('RECEBIDO', 'EM_PRODUCAO', 'PRONTO', 'EM_ROTA', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "tipo_entrega_enum" AS ENUM ('ENTREGA', 'RETIRADA', 'CONSUMO_LOCAL');

-- CreateTable
CREATE TABLE "clientes" (
    "id_cliente" BIGSERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "endereco" VARCHAR(255),
    "numero_endereco" VARCHAR(20),
    "bairro" VARCHAR(100),
    "ponto_referencia" VARCHAR(255),
    "observacoes" TEXT,
    "data_aniversario" DATE,
    "data_cadastro" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_clientes" PRIMARY KEY ("id_cliente")
);

-- CreateTable
CREATE TABLE "acessorios" (
    "id_acessorio" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "preco_padrao" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "estoque_atual" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_acessorios" PRIMARY KEY ("id_acessorio")
);

-- CreateTable
CREATE TABLE "acessorios_pedido" (
    "id_acessorio_pedido" SERIAL NOT NULL,
    "id_pedido" BIGINT NOT NULL,
    "id_acessorio" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_acessorios_pedido" PRIMARY KEY ("id_acessorio_pedido")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id_categoria" SERIAL NOT NULL,
    "nome_categoria" VARCHAR(150) NOT NULL,
    "descricao" TEXT,
    "unidades_por_pacote_padrao" INTEGER NOT NULL DEFAULT 1,
    "permite_imagem" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_categorias" PRIMARY KEY ("id_categoria")
);

-- CreateTable
CREATE TABLE "combos" (
    "id_combo" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_combos" PRIMARY KEY ("id_combo")
);

-- CreateTable
CREATE TABLE "configuracoes_sistema" (
    "id_configuracao" SERIAL NOT NULL,
    "chave" VARCHAR(100) NOT NULL,
    "valor_json" JSONB NOT NULL,
    "descricao" TEXT,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_configuracoes_sistema" PRIMARY KEY ("id_configuracao")
);

-- CreateTable
CREATE TABLE "entregadores" (
    "id_entregador" SERIAL NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "telefone" VARCHAR(20),
    "veiculo" VARCHAR(100),
    "placa" VARCHAR(15),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_entregadores" PRIMARY KEY ("id_entregador")
);

-- CreateTable
CREATE TABLE "itens_combo" (
    "id_item_combo" SERIAL NOT NULL,
    "id_combo" INTEGER NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL DEFAULT 1.000,

    CONSTRAINT "pk_itens_combo" PRIMARY KEY ("id_item_combo")
);

-- CreateTable
CREATE TABLE "limites_horario" (
    "id_limite_horario" SERIAL NOT NULL,
    "data" DATE NOT NULL,
    "horario_inicio" TIMESTAMPTZ(6) NOT NULL,
    "horario_fim" TIMESTAMPTZ(6) NOT NULL,
    "limite_pedidos" INTEGER NOT NULL DEFAULT 0,
    "pedidos_agendados" INTEGER NOT NULL DEFAULT 0,
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_limites_horario" PRIMARY KEY ("id_limite_horario")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id_pedido" BIGSERIAL NOT NULL,
    "codigo_comanda" VARCHAR(50),
    "id_cliente" BIGINT,
    "id_usuario_atendente" UUID,
    "id_limite_horario" INTEGER,
    "id_entregador" INTEGER,
    "tipo_entrega" "tipo_entrega_enum" NOT NULL,
    "data_pedido" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_entrega_agendada" DATE,
    "horario_entrega_agendada" TIME(6),
    "status_pedido" "status_pedido_enum" NOT NULL DEFAULT 'RECEBIDO',
    "status_pagamento" "status_pagamento_enum" NOT NULL DEFAULT 'PENDENTE',
    "valor_subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "taxa_entrega" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "desconto_percentual" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "valor_desconto" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "valor_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "forma_pagamento" VARCHAR(100),
    "peixe_status_cor" "peixe_status_cor_enum" NOT NULL DEFAULT 'NENHUM',
    "estoque_baixado" BOOLEAN NOT NULL DEFAULT false,
    "foto_referencia_url" TEXT,
    "observacoes_pedido" TEXT,
    "detalhes_personalizacao" TEXT,
    "motivo_cancelamento" TEXT,
    "cancelado_em" TIMESTAMPTZ(6),
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_pedidos" PRIMARY KEY ("id_pedido")
);

-- CreateTable
CREATE TABLE "permissoes_funcionario" (
    "id_permissao" SERIAL NOT NULL,
    "id_usuario" UUID NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_permissoes_funcionario" PRIMARY KEY ("id_permissao")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id_produto" SERIAL NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "descricao" TEXT,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "unidade_medida" VARCHAR(20) NOT NULL DEFAULT 'Unidade',
    "multiplo_minimo" INTEGER NOT NULL DEFAULT 1,
    "tempo_preparo_minutos" INTEGER NOT NULL DEFAULT 0,
    "url_imagem" TEXT,
    "permite_imagem" BOOLEAN NOT NULL DEFAULT false,
    "estoque_atual" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "estoque_critico" DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_produtos" PRIMARY KEY ("id_produto")
);

-- CreateTable
CREATE TABLE "propriedades_pedido" (
    "id_item_pedido" BIGSERIAL NOT NULL,
    "id_pedido" BIGINT NOT NULL,
    "id_produto" INTEGER,
    "id_combo" INTEGER,
    "quantidade" DECIMAL(10,3) NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "massa_escolhida" VARCHAR(100),
    "recheio_escolhido" VARCHAR(100),
    "cobertura_escolhida" VARCHAR(100),
    "escrita_personalizada" VARCHAR(255),
    "observacoes_item" TEXT,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pk_propriedades_pedido" PRIMARY KEY ("id_item_pedido")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "perfil_acesso" "perfil_acesso_enum" NOT NULL DEFAULT 'ATENDENTE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "item_ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMPTZ(6),
    "id_autenticacao_supabase" UUID NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateIndex
CREATE INDEX "idx_acessorios_pedido_acessorio" ON "acessorios_pedido"("id_acessorio");

-- CreateIndex
CREATE INDEX "idx_acessorios_pedido_pedido" ON "acessorios_pedido"("id_pedido");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_sistema_chave_key" ON "configuracoes_sistema"("chave");

-- CreateIndex
CREATE INDEX "idx_itens_combo_combo" ON "itens_combo"("id_combo");

-- CreateIndex
CREATE INDEX "idx_itens_combo_produto" ON "itens_combo"("id_produto");

-- CreateIndex
CREATE UNIQUE INDEX "uq_itens_combo_combo_produto" ON "itens_combo"("id_combo", "id_produto");

-- CreateIndex
CREATE INDEX "idx_pedidos_atendente" ON "pedidos"("id_usuario_atendente");

-- CreateIndex
CREATE INDEX "idx_pedidos_cliente" ON "pedidos"("id_cliente");

-- CreateIndex
CREATE INDEX "idx_pedidos_entregador" ON "pedidos"("id_entregador");

-- CreateIndex
CREATE INDEX "idx_pedidos_limite_horario" ON "pedidos"("id_limite_horario");

-- CreateIndex
CREATE INDEX "idx_permissoes_usuario" ON "permissoes_funcionario"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_produtos_categoria" ON "produtos"("id_categoria");

-- CreateIndex
CREATE INDEX "idx_propriedades_pedido_combo" ON "propriedades_pedido"("id_combo");

-- CreateIndex
CREATE INDEX "idx_propriedades_pedido_pedido" ON "propriedades_pedido"("id_pedido");

-- CreateIndex
CREATE INDEX "idx_propriedades_pedido_produto" ON "propriedades_pedido"("id_produto");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_id_autenticacao_supabase_key" ON "usuarios"("id_autenticacao_supabase");

-- AddForeignKey
ALTER TABLE "acessorios_pedido" ADD CONSTRAINT "fk_acessorios_pedido_acessorios" FOREIGN KEY ("id_acessorio") REFERENCES "acessorios"("id_acessorio") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "acessorios_pedido" ADD CONSTRAINT "fk_acessorios_pedido_pedidos" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "itens_combo" ADD CONSTRAINT "fk_itens_combo_combos" FOREIGN KEY ("id_combo") REFERENCES "combos"("id_combo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "itens_combo" ADD CONSTRAINT "fk_itens_combo_produtos" FOREIGN KEY ("id_produto") REFERENCES "produtos"("id_produto") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "fk_pedidos_clientes" FOREIGN KEY ("id_cliente") REFERENCES "clientes"("id_cliente") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "fk_pedidos_entregadores" FOREIGN KEY ("id_entregador") REFERENCES "entregadores"("id_entregador") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "fk_pedidos_limites_horario" FOREIGN KEY ("id_limite_horario") REFERENCES "limites_horario"("id_limite_horario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "fk_pedidos_usuarios" FOREIGN KEY ("id_usuario_atendente") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "permissoes_funcionario" ADD CONSTRAINT "fk_permissoes_usuarios" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "fk_produtos_categorias" FOREIGN KEY ("id_categoria") REFERENCES "categorias"("id_categoria") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "propriedades_pedido" ADD CONSTRAINT "fk_propriedades_pedido_combos" FOREIGN KEY ("id_combo") REFERENCES "combos"("id_combo") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "propriedades_pedido" ADD CONSTRAINT "fk_propriedades_pedido_pedidos" FOREIGN KEY ("id_pedido") REFERENCES "pedidos"("id_pedido") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "propriedades_pedido" ADD CONSTRAINT "fk_propriedades_pedido_produtos" FOREIGN KEY ("id_produto") REFERENCES "produtos"("id_produto") ON DELETE RESTRICT ON UPDATE NO ACTION;
