import { prisma } from "../database/prisma.js";

function prepararDados(dados) {
  const preparados = { ...dados };
  for (const campo of ["endereco", "numeroEndereco", "bairro", "pontoReferencia", "observacoes"]) {
    if (preparados[campo] === "") preparados[campo] = null;
  }
  if (Object.hasOwn(preparados, "dataAniversario")) {
    preparados.dataAniversario = preparados.dataAniversario
      ? new Date(`${preparados.dataAniversario}T00:00:00.000Z`)
      : null;
  }
  return preparados;
}

function serializar(cliente) {
  return cliente ? { ...cliente, idCliente: cliente.idCliente.toString() } : null;
}

export class ClienteRepository {
  async criar(dados) {
    return serializar(await prisma.cliente.create({ data: prepararDados(dados) }));
  }

  async buscarPorId(idCliente) {
    return serializar(await prisma.cliente.findFirst({
      where: { idCliente: BigInt(idCliente), itemAtivo: true, deletadoEm: null },
    }));
  }

  async listar({ busca, pagina, limite }) {
    const where = {
      itemAtivo: true,
      deletadoEm: null,
      ...(busca && {
        OR: [
          { nome: { contains: busca, mode: "insensitive" } },
          { telefone: { contains: busca } },
          { bairro: { contains: busca, mode: "insensitive" } },
        ],
      }),
    };
    const [clientes, total] = await prisma.$transaction([
      prisma.cliente.findMany({
        where,
        orderBy: { nome: "asc" },
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.cliente.count({ where }),
    ]);
    return { clientes: clientes.map(serializar), total };
  }

  async atualizar(idCliente, dados) {
    return serializar(await prisma.cliente.update({
      where: { idCliente: BigInt(idCliente) },
      data: prepararDados(dados),
    }));
  }

  async excluir(idCliente) {
    const resultado = await prisma.cliente.updateMany({
      where: { idCliente: BigInt(idCliente), itemAtivo: true, deletadoEm: null },
      data: { itemAtivo: false, deletadoEm: new Date() },
    });
    return resultado.count > 0;
  }
}
