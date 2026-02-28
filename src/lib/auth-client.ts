// Como o login agora é centralizado, o cliente apenas verifica o cookie
// ou redireciona para o login central.

export const authClient = {
  // Função de sign out para o botão de logoff
  signOut: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/authentication";
  },

  // Hook mockado para não quebrar a Sidebar e outros componentes
  useSession: () => {
    // Nota: Em um sistema real, você buscaria isso de um Context/Provider
    // Para o build passar, retornamos um estado básico ou nulo
    return {
      data: null,
      isPending: false,
    };
  },
};
