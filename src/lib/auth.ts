// src/lib/auth.ts
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth/jwt";

const getSessionLogic = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return null;

    const payload = verifyAccessToken(token);
    if (!payload) return null;

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.email.split("@")[0], // Fallback simples para nome
      },
      session: {
        expires: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
      },
    };
  } catch (e) {
    return null;
  }
};

export const auth = {
  getSession: getSessionLogic,
  api: {
    getSession: getSessionLogic, // Permite usar auth.api.getSession sem dar erro
  },
};
