// src/actions/clinic/get-clinic.ts - CORRIGIDO
"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { ClinicPaymentMethod } from "@/app/(protected)/clinic/_constants";
import { db } from "@/db";
import { clinicsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

export const getClinic = actionClient.action(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || !session.user.clinic?.id) {
    throw new Error("Não autorizado ou clínica não encontrada");
  }

  const clinic = await db.query.clinicsTable.findFirst({
    where: eq(clinicsTable.id, session.user.clinic.id),
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
