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
      if (id !== session.user.clinic?.id) {
        throw new Error("Você não tem permissão para editar esta clínica.");
      }

      await db
        .update(clinicsTable)
        .set(dataToUpsert)
        .where(eq(clinicsTable.id, id));

      revalidatePath("/", "layout");
    } else {
      if (session.user.clinic) {
        throw new Error("Usuário já possui uma clínica associada.");
      }

      const [newClinic] = await db
        .insert(clinicsTable)
        .values(dataToUpsert)
        .returning();

      await db.insert(usersToClinicsTable).values({
        userId: session.user.id,
        clinicId: newClinic.id,
      });

      redirect("/dashboard");
    }

    return { success: true };
  });
