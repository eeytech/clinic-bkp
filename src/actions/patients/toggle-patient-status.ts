// src/actions/patients/toggle-patient-status.ts
"use server";

import { and, eq, not } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { patientCadastralStatusEnum, patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

const togglePatientStatusSchema = z.object({
  id: z.string().uuid(),
  currentStatus: z.enum(patientCadastralStatusEnum.enumValues),
});

export const togglePatientStatus = actionClient
  .schema(togglePatientStatusSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user?.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const { id, currentStatus } = parsedInput;
    const clinicId = session.user.clinic.id;

    const newStatus = currentStatus === "active" ? "inactive" : "active";

    const result = await db
      .update(patientsTable)
      .set({ cadastralStatus: newStatus })
      .where(
        and(eq(patientsTable.id, id), eq(patientsTable.clinicId, clinicId)),
      )
      .returning({ updatedId: patientsTable.id }); // Retorna algo para confirmar a atualização

    if (result.length === 0) {
      throw new Error("Paciente não encontrado ou não pertence à clínica.");
    }

    revalidatePath("/patients");
    revalidatePath(`/patients/${id}`); // Revalida também a página de detalhes

    return { success: true, newStatus };
  });
