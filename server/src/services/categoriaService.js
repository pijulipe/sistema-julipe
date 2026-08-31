export class CategoriaService {
  constructor(categoriaRepository) {
    this.categoriaRepository = categoriaRepository;
  }

  async listar() {
    return { dados: await this.categoriaRepository.listarAtivas() };
  }
}
