"use server";

import dayjs from "dayjs"; // Adicionado dayjs
import { and, eq, sql, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { patientFinancesTable, patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { upsertFinanceSchema } from "./schema";

// Helper para recalcular e atualizar o status financeiro do paciente
async function updatePatientFinancialStatus(
  patientId: string,
  clinicId: string,
) {
  const [totals] = await db
    .select({
      totalCharges:
        sql<number>`COALESCE(SUM(CASE WHEN type = 'charge' THEN amount_in_cents ELSE 0 END), 0)`.as(
          "total_charges",
        ),
      totalPayments:
        sql<number>`COALESCE(SUM(CASE WHEN type = 'payment' THEN amount_in_cents ELSE 0 END), 0)`.as(
          "total_payments",
        ),
    })
    .from(patientFinancesTable)
    .where(
      and(
        eq(patientFinancesTable.patientId, patientId),
        eq(patientFinancesTable.clinicId, clinicId),
      ),
    );

  const balance = Number(totals.totalPayments) - Number(totals.totalCharges);
  const newStatus = balance >= 0 ? "adimplente" : "inadimplente";

  await db
    .update(patientsTable)
    .set({ financialStatus: newStatus })
    .where(eq(patientsTable.id, patientId));

  revalidatePath(`/patients/${patientId}/financials`);
}

// Action para criar/atualizar um registro financeiro (cobrança ou pagamento)
export const upsertFinance = actionClient
  .schema(upsertFinanceSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const { id, patientId, ...data } = parsedInput;
    const clinicId = session.user.clinic.id;

    // CORREÇÃO: Formata a data para o formato esperado pelo banco de dados
    const formattedDueDate = data.dueDate
      ? dayjs(data.dueDate).format("YYYY-MM-DD")
      : null;

    const values = {
      ...data,
      dueDate: formattedDueDate, // Usa a data formatada
      patientId,
      clinicId,
      amountInCents: data.amount * 100,
    };

    if (id) {
      // Atualizar registro existente
      await db
        .update(patientFinancesTable)
        .set(values)
        .where(
          and(
            eq(patientFinancesTable.id, id),
            eq(patientFinancesTable.clinicId, clinicId),
          ),
        );
    } else {
      // Inserir novo registro
      await db.insert(patientFinancesTable).values(values);
    }

    // Atualizar o status do paciente
    await updatePatientFinancialStatus(patientId, clinicId);

    return { success: true };
  });

// Action para deletar um registro financeiro
export const deleteFinance = actionClient
  .schema(z.object({ id: z.number(), patientId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const clinicId = session.user.clinic.id;
    const { id, patientId } = parsedInput;

    await db
      .delete(patientFinancesTable)
      .where(
        and(
          eq(patientFinancesTable.id, id),
          eq(patientFinancesTable.clinicId, clinicId),
        ),
      );

    await updatePatientFinancialStatus(patientId, clinicId);

    return { success: true };
  });

// Action para buscar o histórico financeiro de um paciente
export const getPatientFinances = actionClient
  .schema(z.object({ patientId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const finances = await db.query.patientFinancesTable.findMany({
      where: and(
        eq(patientFinancesTable.patientId, parsedInput.patientId),
        eq(patientFinancesTable.clinicId, session.user.clinic.id),
      ),
      orderBy: (finances, { desc }) => [desc(finances.createdAt)],
    });

    return finances;
  });
