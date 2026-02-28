"use server";

import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { odontogramsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

export const getOdontogramByPatient = actionClient
  .schema(z.object({ patientId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const odontograms = await db.query.odontogramsTable.findMany({
      where: and(
        eq(odontogramsTable.patientId, parsedInput.patientId),
        eq(odontogramsTable.clinicId, session.user.clinic.id),
      ),
      orderBy: [desc(odontogramsTable.date)],
      with: {
        marks: true,
        doctor: {
          columns: {
            name: true,
            id: true,
          },
        },
      },
    });

    return odontograms;
  });
