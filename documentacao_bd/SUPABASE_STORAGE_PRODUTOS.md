# Configuração do Storage de Produtos

O backend não cria nem altera recursos remotos automaticamente. No painel do Supabase:

1. Acesse **Storage → New bucket**.
2. Use exatamente o nome `imagens-produtos`.
3. Mantenha o bucket **privado**.
4. Defina o limite de arquivo como **5 MB**.
5. Restrinja os tipos MIME a `image/png`, `image/jpeg` e `image/webp`.
6. Não crie políticas para `authenticated`. Upload, leitura e remoção são autorizados pelo backend com `SUPABASE_SERVICE_ROLE_KEY`; o frontend recebe apenas tokens e URLs temporários para um caminho específico.

Variáveis usadas no backend: `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. O frontend continua usando apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; a chave de serviço nunca deve ser exposta nele.

Para verificar, autentique um usuário gerente ou com a permissão `PRODUTO`, abra Produtos, selecione Bolos ou Doces, envie uma imagem válida e salve. Confirme que o objeto foi criado sob `temporarios/`, que `produtos.url_imagem` contém somente esse caminho e que a listagem exibe a foto por URL assinada.

Um upload concluído cujo cadastro ou edição seja cancelado pode deixar um objeto órfão. Como solução simples para esta versão, os caminhos usam nomes UUID imprevisíveis sob `temporarios/`; objetos nessa pasta que não sejam referenciados por `produtos.url_imagem` podem ser removidos periodicamente por uma rotina administrativa. Falhas ao remover uma imagem antiga também podem deixar o arquivo sem associação, mas nunca mantêm uma associação incorreta no banco.
