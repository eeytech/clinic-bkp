"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

export const getPatientById = actionClient
  .schema(z.object({ patientId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const patient = await db.query.patientsTable.findFirst({
      where: and(
        eq(patientsTable.id, parsedInput.patientId),
        eq(patientsTable.clinicId, session.user.clinic.id),
      ),
    });

    if (!patient) {
      throw new Error("Paciente não encontrado.");
    }

    return patient;
  });
