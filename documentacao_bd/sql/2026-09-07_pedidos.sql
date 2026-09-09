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
