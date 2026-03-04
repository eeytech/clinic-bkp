import { useEffect, useState } from "react";

type ClientSession = {
  email?: string;
  name?: string;
  clinic?: { id: string; name?: string } | null;
  companies?: { id: string; name: string }[];
  activeCompanyId?: string;
};

export const authClient = {
  signOut: async () => {
    console.log("AuthClient Debug - signOut chamado");
    await fetch("/api/auth/logout", { method: "POST" });
    console.log("AuthClient Debug - redirecionando para /authentication");
    window.location.href = "/authentication";
  },

  useSession: () => {
    const [data, setData] = useState<{
      user: {
        email?: string;
        name?: string;
        clinic?: { id: string; name?: string } | null;
      };
    } | null>(null);
    const [isPending, setIsPending] = useState(true);

    useEffect(() => {
      let isMounted = true;
      console.log("AuthClient Debug - useSession iniciado");
      const loadSession = async () => {
        try {
          console.log("AuthClient Debug - Chamando /api/admin-auth/session");
          const response = await fetch("/api/admin-auth/session", {
            credentials: "include",
            cache: "no-store",
          });
          console.log(
            "AuthClient Debug - Status da resposta:",
            response.status,
          );
          if (!isMounted) {
            console.log(
              "AuthClient Debug - Componente desmontado antes da resposta",
            );
            return;
          }

          if (!response.ok) {
            console.warn(
              "AuthClient Debug - Response não OK, setando data como null",
            );
            setData(null);
            return;
          }

          const payload = (await response.json()) as {
            session?: ClientSession;
          };
          console.log("AuthClient Debug - Payload recebido:", payload);

          setData({
            user: {
              email: payload.session?.email,
              name: payload.session?.name,
              clinic: payload.session?.clinic ?? null,
            },
          });
        } catch {
          console.error("AuthClient Debug - Erro ao carregar sessão:");
          if (isMounted) setData(null);
        } finally {
          console.log("AuthClient Debug - Finalizando loading");
          if (isMounted) setIsPending(false);
        }
      };

      loadSession();

      return () => {
        console.log("AuthClient Debug - useSession desmontado");
        isMounted = false;
      };
    }, []);

    return {
      data,
      isPending,
    };
  },
};
