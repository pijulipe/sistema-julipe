const urlDaApi = import.meta.env.VITE_API_URL
if (!urlDaApi){
    throw new Error("Configuração inválida: VITE_API_URL é obrigatória.");
}

export { urlDaApi }