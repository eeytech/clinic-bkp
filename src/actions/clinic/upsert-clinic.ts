"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { clinicsTable, userClinicsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { upsertClinicSchema } from "./schema";

const ADMIN_ACTIONS = new Set(["FULL", "ADMIN", "WRITE"]);

const hasClinicAdminPermission = (session: Awaited<ReturnType<typeof auth.api.getSession>>) => {
  if (!session?.user) return false;
  if (session.user.isApplicationAdmin) return true;

  const permissionEntries = Object.entries(session.user.permissions ?? {});
  return permissionEntries.some(([moduleSlug, actions]) => {
    const normalizedModule = moduleSlug.toLowerCase();
    const isClinicModule = normalizedModule.includes("clinic") || normalizedModule.includes("clinica");
    if (!isClinicModule) return false;

    return (actions ?? []).some((action) => ADMIN_ACTIONS.has(action));
  });
};

export const upsertClinic = actionClient
  .schema(upsertClinicSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession();

    if (!session?.user) {
      throw new Error("Nao autorizado.");
    }

    if (!hasClinicAdminPermission(session)) {
      throw new Error("Apenas administradores podem editar clinicas.");
    }

    const { clinicId, id, ...clinicData } = parsedInput;

    const targetClinicId = id ?? clinicId;
    if (id && id !== clinicId) {
      throw new Error("Clinica invalida para atualizacao.");
    }

    const allowedClinicIds = new Set((session.user.clinics ?? []).map((clinic) => clinic.id));
    const tokenCompanyIds = new Set(
      (session.user.companies ?? []).map((company) => company.id),
    );
    if (!session.user.isApplicationAdmin && !allowedClinicIds.has(targetClinicId)) {
      throw new Error("Voce nao possui acesso a esta clinica.");
    }

    const existingClinic = await db.query.clinicsTable.findFirst({
      where: and(
        eq(clinicsTable.id, targetClinicId),
        eq(clinicsTable.applicationId, session.user.applicationId),
      ),
    });

    if (!existingClinic) {
      if (!session.user.isApplicationAdmin) {
        throw new Error("Clinica nao encontrada no sistema.");
      }
      if (!tokenCompanyIds.has(targetClinicId)) {
        throw new Error("Clinica nao encontrada no contexto da sua sessao.");
      }

      await db.insert(clinicsTable).values({
        id: targetClinicId,
        applicationId: session.user.applicationId,
        ...clinicData,
        paymentMethods: clinicData.paymentMethods as typeof clinicsTable.$inferInsert.paymentMethods,
      });

      await db
        .insert(userClinicsTable)
        .values({
          userId: session.user.id,
          clinicId: targetClinicId,
        })
        .onConflictDoNothing();
    } else {
      await db
        .update(clinicsTable)
        .set({
          ...clinicData,
          paymentMethods: clinicData.paymentMethods as typeof clinicsTable.$inferInsert.paymentMethods,
        })
        .where(eq(clinicsTable.id, targetClinicId));
    }

    revalidatePath("/", "layout");
    revalidatePath("/clinic/select");
    return { success: true };
  });
