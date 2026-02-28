"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { anamnesesTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { anamnesisSchema } from "./schema";

export type AnamnesisRecord = typeof anamnesesTable.$inferSelect & {
  creator: { id: string; name: string };
};

const generateSummary = (data: z.infer<typeof anamnesisSchema>): string => {
  const chiefComplaint =
    data.chiefComplaint || "Nenhuma queixa principal registrada.";
  const conditions = data.knownConditions?.length
    ? data.knownConditions
        .map((c) => c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, " "))
        .join(", ")
    : "Nenhuma condição conhecida.";

  return `Queixa: ${chiefComplaint}. Condições: ${conditions}.`;
};

export const upsertAnamnesis = actionClient
  .schema(
    anamnesisSchema.extend({
      onsetDate: z.string().optional().nullable(),
      lastDentalVisit: z.string().optional().nullable(),
      consentDate: z.string().optional().nullable(),
      followUpDate: z.string().optional().nullable(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !session.user.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const { id, patientId, ...formData } = parsedInput;
    const clinicId = session.user.clinic.id;
    const createdBy = session.user.id;

    const dataForSummary = {
      patientId,
      ...formData,
    } as z.infer<typeof anamnesisSchema>;

    const dataToStore = Object.fromEntries(
      Object.entries(formData).filter(([key]) => key !== "id"),
    );
    const summary = generateSummary(dataForSummary);

    if (id) {
      await db
        .update(anamnesesTable)
        .set({
          summary,
          data: dataToStore,
          attachments: parsedInput.attachments || [],
        })
        .where(
          and(eq(anamnesesTable.id, id), eq(anamnesesTable.clinicId, clinicId)),
        );
    } else {
      const latestRecord = await db.query.anamnesesTable.findFirst({
        where: and(
          eq(anamnesesTable.patientId, patientId),
          eq(anamnesesTable.clinicId, clinicId),
        ),
        orderBy: desc(anamnesesTable.version),
      });

      const nextVersionForInsert = latestRecord ? latestRecord.version + 1 : 1;

      await db.insert(anamnesesTable).values({
        patientId,
        clinicId,
        createdBy,
        version: nextVersionForInsert,
        status: "draft",
        summary,
        data: dataToStore,
        attachments: parsedInput.attachments || [],
      });
    }

    revalidatePath(`/patients/${patientId}/anamnesis`);
    return { success: true };
  });

export const getAnamnesesByPatient = actionClient
  .schema(z.object({ patientId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !session.user.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const anamneses = await db.query.anamnesesTable.findMany({
      where: and(
        eq(anamnesesTable.patientId, parsedInput.patientId),
        eq(anamnesesTable.clinicId, session.user.clinic.id),
      ),
      orderBy: [desc(anamnesesTable.createdAt)],
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    return anamneses;
  });
