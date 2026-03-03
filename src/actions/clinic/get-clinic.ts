// src/actions/clinic/get-clinic.ts - CORRIGIDO
"use server";

import { and, eq } from "drizzle-orm";

import { ClinicPaymentMethod } from "@/app/(protected)/clinic/_constants";
import { db } from "@/db";
import { clinicsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

export const getClinic = actionClient.action(async () => {
  const session = await auth.api.getSession();

  if (!session?.user || !session.user.clinic?.id) {
    throw new Error("Não autorizado ou clínica não encontrada");
  }

  const clinic = await db.query.clinicsTable.findFirst({
    where: and(
      eq(clinicsTable.id, session.user.clinic.id),
      eq(clinicsTable.applicationId, session.user.applicationId),
    ),
  });

  if (!clinic) {
    throw new Error("Clínica não encontrada.");
  }

  const cleanedPaymentMethods = clinic.paymentMethods?.filter(Boolean) ?? [];

  return {
    ...clinic,
    paymentMethods: cleanedPaymentMethods as ClinicPaymentMethod[],
  };
});
