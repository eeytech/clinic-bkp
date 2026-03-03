// src/actions/clinic/manage-users.ts
"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userClinicsTable, usersTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";
import { addUserToClinicSchema } from "./schema";

export const addUserToClinic = actionClient
  .schema(addUserToClinicSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession();

    if (!session?.user?.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    // Verificar se o usuário atual é ADMIN
    const clinicPermissions = session.user.permissions["CLINIC"] || [];
    const isAdmin =
      clinicPermissions.includes("FULL") || clinicPermissions.includes("ADMIN");

    if (!isAdmin) {
      throw new Error("Apenas administradores podem gerir usuários.");
    }

    const { email } = parsedInput;

    // 1. Verificar se o usuário já existe no banco local
    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, email),
    });

    // 2. Se não existir, criamos um registro "placeholder"
    // O ID será o próprio email temporariamente, mas será atualizado no primeiro login
    if (!user) {
      const [newUser] = await db
        .insert(usersTable)
        .values({
          id: `pending_${email}`, // Prefixo para identificar que ainda não logou
          email: email,
          name: email.split("@")[0],
          emailVerified: false,
        })
        .returning();
      user = newUser;
    }

    // 3. Vincular o usuário à clínica
    await db
      .insert(userClinicsTable)
      .values({
        userId: user.id,
        clinicId: session.user.clinic.id,
      })
      .onConflictDoNothing();

    revalidatePath("/clinic");
    return { success: true };
  });
