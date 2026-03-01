// src/actions/clinic/upsert-clinic.ts
"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  clinicPaymentMethodsEnum,
  clinicsTable,
  usersTable, // Adicionado para garantir a existência do usuário
  usersToClinicsTable,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { upsertClinicSchema } from "./schema";

export const upsertClinic = actionClient
  .schema(upsertClinicSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Não autorizado.");
    }

    const { id, ...clinicData } = parsedInput;

    const dataToUpsert = {
      ...clinicData,
      paymentMethods:
        clinicData.paymentMethods as typeof clinicPaymentMethodsEnum.enumValues,
    };

    if (id) {
      // Lógica de Edição
      if (id !== (session.user as any).clinic?.id) {
        throw new Error("Você não tem permissão para editar esta clínica.");
      }

      await db
        .update(clinicsTable)
        .set(dataToUpsert)
        .where(eq(clinicsTable.id, id));

      revalidatePath("/", "layout");
    } else {
      // Lógica de Criação
      if ((session.user as any).clinic) {
        throw new Error("Usuário já possui uma clínica associada.");
      }

      // 1. GARANTIR QUE O USUÁRIO EXISTE NO BANCO LOCAL
      // Como o login é feito via API externa, precisamos sincronizar o usuário no banco local
      // para satisfazer a chave estrangeira em 'users_to_clinics'.
      await db
        .insert(usersTable)
        .values({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          emailVerified: true, // Considerado verificado pois vem de uma sessão válida
        })
        .onConflictDoUpdate({
          target: usersTable.id,
          set: {
            name: session.user.name,
            email: session.user.email,
            updatedAt: new Date(),
          },
        });

      // 2. CRIAR A CLÍNICA
      const [newClinic] = await db
        .insert(clinicsTable)
        .values(dataToUpsert)
        .returning();

      // 3. VINCULAR O USUÁRIO À CLÍNICA
      await db.insert(usersToClinicsTable).values({
        userId: session.user.id,
        clinicId: newClinic.id,
      });

      redirect("/dashboard");
    }

    return { success: true };
  });
