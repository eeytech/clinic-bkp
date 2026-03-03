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
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/authentication";
  },

  useSession: () => {
    const [data, setData] = useState<{
      user: { email?: string; name?: string; clinic?: { id: string; name?: string } | null };
    } | null>(null);
    const [isPending, setIsPending] = useState(true);

    useEffect(() => {
      let isMounted = true;

      const loadSession = async () => {
        try {
          const response = await fetch("/api/admin-auth/session", {
            credentials: "include",
            cache: "no-store",
          });

          if (!isMounted) return;

          if (!response.ok) {
            setData(null);
            return;
          }

          const payload = (await response.json()) as {
            session?: ClientSession;
          };

          setData({
            user: {
              email: payload.session?.email,
              name: payload.session?.name,
              clinic: payload.session?.clinic ?? null,
            },
          });
        } catch {
          if (isMounted) setData(null);
        } finally {
          if (isMounted) setIsPending(false);
        }
      };

      loadSession();

      return () => {
        isMounted = false;
      };
    }, []);

    return {
      data,
      isPending,
    };
  },
};
