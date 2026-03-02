// src/lib/auth.ts
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { db } from "@/db";
import { usersTable, usersToClinicsTable } from "@/db/schema";

const getSessionLogic = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return null;

    const payload = verifyAccessToken(token);
    if (!payload) return null;

    // --- LÓGICA DE SINCRONIZAÇÃO E PLACEHOLDER ---
    // Verifica se o usuário logado possui um registro (ou placeholder) no banco local
    const existingUser = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, payload.email),
    });

    if (existingUser && existingUser.id.startsWith("pending_")) {
      // Caso o usuário tenha sido convidado via e-mail, atualizamos o ID placeholder
      // para o ID real do eeytech-admin (payload.sub)
      await db.transaction(async (tx) => {
        await tx
          .update(usersTable)
          .set({ id: payload.sub, updatedAt: new Date() })
          .where(eq(usersTable.id, existingUser.id));

        await tx
          .update(usersToClinicsTable)
          .set({ userId: payload.sub, updatedAt: new Date() })
          .where(eq(usersToClinicsTable.userId, existingUser.id));
      });
    } else if (!existingUser) {
      // Se não houver registro nem placeholder, sincronizamos o usuário
      await db
        .insert(usersTable)
        .values({
          id: payload.sub,
          email: payload.email,
          name: payload.name || payload.email.split("@")[0],
          emailVerified: true,
        })
        .onConflictDoNothing();
    }

    // --- BUSCA DA CLÍNICA VINCULADA ---
    // Buscamos se o ID real do usuário está vinculado a alguma clínica
    const userClinicLink = await db.query.usersToClinicsTable.findFirst({
      where: eq(usersToClinicsTable.userId, payload.sub),
      with: {
        clinic: true,
      },
    });

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split("@")[0],
        // Injeta as permissões (módulos) do eeytech-admin
        permissions: payload.modules || {},
        // Injeta os dados da clínica para serem usados em toda a aplicação
        clinic: userClinicLink?.clinic || null,
      },
      session: {
        expires: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
      },
    };
  } catch (e) {
    console.error("Erro ao processar sessão:", e);
    return null;
  }
};

export const auth = {
  getSession: getSessionLogic,
  api: {
    getSession: getSessionLogic,
  },
};
