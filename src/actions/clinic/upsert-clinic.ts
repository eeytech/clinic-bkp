// src/actions/clinic/upsert-clinic.ts
"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { clinicsTable, usersTable, usersToClinicsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";
import { upsertClinicSchema } from "./schema";

export const upsertClinic = actionClient
  .schema(upsertClinicSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession();

    if (!session?.user) {
      throw new Error("Não autorizado.");
    }

    // --- VALIDAÇÃO DE PERMISSÃO VIA EEYTECH-ADMIN ---
    // Verificamos se no módulo 'CLINIC' (ou o slug que você definiu) o usuário tem 'FULL' ou 'ADMIN'
    const clinicPermissions = session.user.permissions["CLINIC"] || [];
    const isAdmin =
      clinicPermissions.includes("FULL") || clinicPermissions.includes("ADMIN");

    if (!isAdmin) {
      throw new Error(
        "Apenas administradores podem gerenciar os dados da clínica.",
      );
    }

    const { id, ...clinicData } = parsedInput;

    if (id) {
      // Edição: Garante que o admin está editando a clínica à qual ele pertence
      if (id !== session.user.clinic?.id) {
        throw new Error("Você não tem permissão para editar esta clínica.");
      }

      await db
        .update(clinicsTable)
        .set(clinicData)
        .where(eq(clinicsTable.id, id));
    } else {
      // Criação: Sincroniza o usuário e cria o vínculo inicial
      await db
        .insert(usersTable)
        .values({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          emailVerified: true,
        })
        .onConflictDoNothing();

      const [newClinic] = await db
        .insert(clinicsTable)
        .values(clinicData)
        .returning();

      await db.insert(usersToClinicsTable).values({
        userId: session.user.id,
        clinicId: newClinic.id,
      });
    }

    revalidatePath("/", "layout");
    return { success: true };
  });
