// src/actions/clinic-finances/index.ts
"use server"; // <-- Make sure this is the first line

import dayjs from "dayjs";
import {
  and,
  eq,
  gte,
  inArray,
  lt,
  lte,
  ne,
  or,
  SQL,
  sql,
  sum,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import {
  clinicFinancesTable,
  clinicFinancialOperationEnum,
  clinicFinancialStatusEnum, // Import enums for types
  patientFinancesTable,
  patientsTable,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { clinicFinanceSchema } from "./schema";

// Helper to update patient financial status
async function updatePatientFinancialStatus(
  patientId: string,
  clinicId: string,
) {
  // 1. Mark pending charges as overdue if past due date
  await db
    .update(patientFinancesTable)
    .set({ status: "overdue" })
    .where(
      and(
        eq(patientFinancesTable.patientId, patientId),
        eq(patientFinancesTable.clinicId, clinicId),
        eq(patientFinancesTable.type, "charge"),
        eq(patientFinancesTable.status, "pending"),
        lt(patientFinancesTable.dueDate, dayjs().format("YYYY-MM-DD")), // Use string comparison
      ),
    );

  // 2. Check if there are ANY non-paid charges (pending or overdue)
  const [unpaidCharges] = await db
    .select({ count: sql<number>`count(*)` })
    .from(patientFinancesTable)
    .where(
      and(
        eq(patientFinancesTable.patientId, patientId),
        eq(patientFinancesTable.clinicId, clinicId),
        eq(patientFinancesTable.type, "charge"),
        or(
          eq(patientFinancesTable.status, "pending"),
          eq(patientFinancesTable.status, "overdue"),
        ),
      ),
    );

  const newStatus =
    Number(unpaidCharges.count) > 0 ? "inadimplente" : "adimplente";

  // 3. Update patient status
  await db
    .update(patientsTable)
    .set({ financialStatus: newStatus })
    .where(eq(patientsTable.id, patientId));

  // 4. Revalidate relevant paths
  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/financials`);
  revalidatePath("/financials"); // Also revalidate clinic financials page
}

// Schema for date filters
const dateFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

// Action to get clinic finance summary (cards)
export const getClinicFinanceSummary = actionClient
  .schema(dateFilterSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id)
      throw new Error("Não autorizado ou clínica não encontrada.");
    const clinicId = session.user.clinic.id;
    const { from, to } = parsedInput;

    const paymentDateConditions: SQL[] = [];
    if (from)
      paymentDateConditions.push(
        gte(clinicFinancesTable.paymentDate, new Date(from)),
      );
    if (to)
      paymentDateConditions.push(
        lte(clinicFinancesTable.paymentDate, dayjs(to).endOf("day").toDate()),
      ); // Include end of 'to' day

    const dueDateConditions: SQL[] = [];
    if (from)
      dueDateConditions.push(
        gte(patientFinancesTable.dueDate, dayjs(from).format("YYYY-MM-DD")),
      );
    if (to)
      dueDateConditions.push(
        lte(patientFinancesTable.dueDate, dayjs(to).format("YYYY-MM-DD")),
      );

    // Card 1: Total Spent (Paid Outputs in period)
    const [totalSpent] = await db
      .select({ total: sum(clinicFinancesTable.amountInCents).mapWith(Number) }) // Use mapWith for type safety
      .from(clinicFinancesTable)
      .where(
        and(
          eq(clinicFinancesTable.clinicId, clinicId),
          eq(clinicFinancesTable.operation, "output"),
          eq(clinicFinancesTable.status, "paid"),
          ...paymentDateConditions,
        ),
      );

    // Card 2: Total Received (Paid Inputs in period)
    const [totalReceived] = await db
      .select({ total: sum(clinicFinancesTable.amountInCents).mapWith(Number) })
      .from(clinicFinancesTable)
      .where(
        and(
          eq(clinicFinancesTable.clinicId, clinicId),
          eq(clinicFinancesTable.operation, "input"),
          eq(clinicFinancesTable.status, "paid"),
          ...paymentDateConditions,
        ),
      );

    // Card 3: Pending Revenue (Overdue Patient Charges in period by due date)
    const [pendingRevenue] = await db
      .select({
        total: sum(patientFinancesTable.amountInCents).mapWith(Number),
      })
      .from(patientFinancesTable)
      .where(
        and(
          eq(patientFinancesTable.clinicId, clinicId),
          eq(patientFinancesTable.type, "charge"),
          eq(patientFinancesTable.status, "overdue"),
          ...dueDateConditions, // Filter by due date range
        ),
      );

    const spentAmount = totalSpent?.total ?? 0;
    const receivedAmount = totalReceived?.total ?? 0;
    const pendingAmount = pendingRevenue?.total ?? 0;

    // Card 4: Current Balance (Received - Spent in period)
    const currentBalance = receivedAmount - spentAmount;

    return {
      totalSpent: spentAmount,
      totalReceived: receivedAmount,
      pendingRevenue: pendingAmount,
      currentBalance: currentBalance,
    };
  });

// Action to get clinic transactions (list) with filters
export const getClinicTransactions = actionClient
  .schema(
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      status: z.enum(clinicFinancialStatusEnum.enumValues).optional(),
      operation: z.enum(clinicFinancialOperationEnum.enumValues).optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id) throw new Error("Não autorizado");
    const clinicId = session.user.clinic.id;
    const { from, to, status, operation } = parsedInput;

    const conditions: (SQL | undefined)[] = [
      eq(clinicFinancesTable.clinicId, clinicId),
    ];
    if (status) conditions.push(eq(clinicFinancesTable.status, status));
    if (operation)
      conditions.push(eq(clinicFinancesTable.operation, operation));

    // Date filtering (COALESCE paymentDate, dueDate, createdAt)
    const dateColumn = sql`COALESCE(${clinicFinancesTable.paymentDate}, ${clinicFinancesTable.dueDate}::timestamp, ${clinicFinancesTable.createdAt})`;
    if (from)
      conditions.push(gte(dateColumn, dayjs(from).startOf("day").toDate()));
    if (to) conditions.push(lte(dateColumn, dayjs(to).endOf("day").toDate()));

    return db.query.clinicFinancesTable.findMany({
      where: and(...conditions),
      with: {
        patient: { columns: { id: true, name: true } },
        employee: { columns: { id: true, name: true } },
        // CORREÇÃO: Incluir 'id' na seleção do creator
        creator: { columns: { id: true, name: true } },
      },
      orderBy: (table, { desc }) => [
        desc(
          sql`COALESCE(${table.paymentDate}, ${table.dueDate}::timestamp, ${table.createdAt})`,
        ),
      ],
    });
  });

// Action to upsert clinic finance entry
export const upsertClinicFinance = actionClient
  .schema(clinicFinanceSchema) // Use the refined schema
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id)
      throw new Error("Não autorizado ou clínica não encontrada.");

    const {
      id,
      amount,
      dueDate,
      paymentDate,
      linkedPatientChargeIds,
      ...data
    } = parsedInput;
    const clinicId = session.user.clinic.id;

    // Clean up types based on operation
    const typeInput = data.operation === "input" ? data.typeInput : null;
    const typeOutput = data.operation === "output" ? data.typeOutput : null;
    const patientId =
      data.operation === "input" && data.patientId ? data.patientId : null;
    const employeeId =
      data.operation === "output" && data.employeeId ? data.employeeId : null;
    const finalLinkedIds =
      data.operation === "input" && linkedPatientChargeIds
        ? linkedPatientChargeIds
        : null;
    const finalPaymentMethod =
      data.status === "paid" ? data.paymentMethod : null;

    // Ensure status 'overdue' or 'refunded' isn't set manually on creation/update
    if (data.status === "overdue" || data.status === "refunded") {
      throw new Error("Status inválido para criação/edição manual.");
    }
    // Ensure paymentDate exists if status is 'paid'
    if (data.status === "paid" && !paymentDate) {
      throw new Error('Data de pagamento é obrigatória para status "Pago".');
    }

    const values = {
      ...data,
      typeInput,
      typeOutput,
      patientId,
      employeeId,
      amountInCents: Math.round(amount * 100),
      dueDate: dueDate ? dayjs(dueDate).format("YYYY-MM-DD") : null,
      paymentDate: paymentDate ? paymentDate : null,
      paymentMethod: finalPaymentMethod,
      linkedPatientChargeIds: finalLinkedIds,
      clinicId: clinicId,
      createdBy: session.user.id,
    };

    let clinicFinanceId = id;

    // UPSERT Logic
    if (id) {
      const existing = await db.query.clinicFinancesTable.findFirst({
        where: and(
          eq(clinicFinancesTable.id, id),
          eq(clinicFinancesTable.clinicId, clinicId),
        ),
        columns: { status: true },
      });
      if (!existing) throw new Error("Lançamento não encontrado.");
      if (existing.status === "refunded")
        throw new Error("Não é possível editar um lançamento estornado.");
      // If status changed to 'paid', ensure paymentDate is set (handled by schema refine)
      await db
        .update(clinicFinancesTable)
        .set(values)
        .where(eq(clinicFinancesTable.id, id));
    } else {
      const [newEntry] = await db
        .insert(clinicFinancesTable)
        .values(values)
        .returning({ id: clinicFinancesTable.id });
      clinicFinanceId = newEntry.id;
    }

    // Post-UPSERT Logic
    if (values.patientId) {
      if (
        values.operation === "input" &&
        finalLinkedIds &&
        finalLinkedIds.length > 0 &&
        values.status === "paid" && // Only if the clinic entry is marked as paid
        clinicFinanceId // Ensure we have the ID
      ) {
        // Update linked patient charges to 'paid'
        await db
          .update(patientFinancesTable)
          .set({ status: "paid", relatedClinicFinanceId: clinicFinanceId })
          .where(
            and(
              eq(patientFinancesTable.patientId, values.patientId),
              eq(patientFinancesTable.clinicId, clinicId),
              eq(patientFinancesTable.type, "charge"),
              inArray(patientFinancesTable.id, finalLinkedIds), // Use inArray
            ),
          );
      } else if (
        values.operation === "input" &&
        values.typeInput === "Crédito/Adiantamento Paciente" &&
        values.status === "paid" && // Only if the clinic entry is marked as paid
        clinicFinanceId // Ensure we have the ID
      ) {
        // Create corresponding 'payment' entry for the patient
        await db
          .insert(patientFinancesTable)
          .values({
            patientId: values.patientId,
            clinicId: clinicId,
            type: "payment",
            amountInCents: values.amountInCents,
            description: values.description || "Crédito/Adiantamento Recebido",
            method: values.paymentMethod, // Use the same method as the clinic entry
            relatedClinicFinanceId: clinicFinanceId,
            // status and dueDate are not applicable for direct payments
          })
          .onConflictDoNothing(); // Avoid duplicate payments if action reruns
      }
      // Update patient's overall financial status after any relevant change
      await updatePatientFinancialStatus(values.patientId, clinicId);
    }

    revalidatePath("/financials");
    if (values.patientId)
      revalidatePath(`/patients/${values.patientId}/financials`);

    return { success: true, id: clinicFinanceId };
  });

// Action to delete transaction
export const deleteClinicFinance = actionClient
  .schema(z.object({ id: z.number() }))
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id)
      throw new Error("Não autorizado ou clínica não encontrada.");
    const clinicId = session.user.clinic.id;

    const transaction = await db.query.clinicFinancesTable.findFirst({
      where: and(
        eq(clinicFinancesTable.id, parsedInput.id),
        eq(clinicFinancesTable.clinicId, clinicId),
      ),
      columns: {
        status: true,
        patientId: true,
        operation: true,
        typeInput: true,
      }, // Get needed fields
    });

    if (!transaction) throw new Error("Lançamento não encontrado.");
    if (transaction.status === "paid" || transaction.status === "refunded") {
      throw new Error(
        "Não é possível excluir um lançamento pago ou estornado.",
      );
    }

    await db
      .delete(clinicFinancesTable)
      .where(eq(clinicFinancesTable.id, parsedInput.id));

    // If it was a patient credit/advance (input), delete the corresponding patient payment
    if (
      transaction.patientId &&
      transaction.operation === "input" &&
      transaction.typeInput === "Crédito/Adiantamento Paciente"
    ) {
      await db
        .delete(patientFinancesTable)
        .where(
          and(
            eq(patientFinancesTable.patientId, transaction.patientId),
            eq(patientFinancesTable.clinicId, clinicId),
            eq(patientFinancesTable.type, "payment"),
            eq(patientFinancesTable.relatedClinicFinanceId, parsedInput.id),
          ),
        );
      await updatePatientFinancialStatus(transaction.patientId, clinicId); // Update status after removal
    }

    revalidatePath("/financials");
    if (transaction.patientId)
      revalidatePath(`/patients/${transaction.patientId}/financials`);

    return { success: true };
  });

// Action to refund transaction
export const refundClinicFinance = actionClient
  .schema(z.object({ id: z.number() }))
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id)
      throw new Error("Não autorizado ou clínica não encontrada.");
    const clinicId = session.user.clinic.id;

    const transaction = await db.query.clinicFinancesTable.findFirst({
      where: and(
        eq(clinicFinancesTable.id, parsedInput.id),
        eq(clinicFinancesTable.clinicId, clinicId),
      ),
      columns: {
        status: true,
        patientId: true,
        operation: true,
        linkedPatientChargeIds: true,
        typeInput: true,
      },
    });

    if (!transaction) throw new Error("Lançamento não encontrado.");
    if (transaction.status !== "paid")
      throw new Error("Apenas lançamentos pagos podem ser estornados.");

    // Update clinic transaction status
    await db
      .update(clinicFinancesTable)
      .set({ status: "refunded" })
      .where(eq(clinicFinancesTable.id, parsedInput.id));

    // Revert related patient charges if applicable
    if (
      transaction.patientId &&
      transaction.operation === "input" &&
      transaction.linkedPatientChargeIds &&
      transaction.linkedPatientChargeIds.length > 0
    ) {
      const chargesToRevert = await db.query.patientFinancesTable.findMany({
        where: and(
          eq(patientFinancesTable.patientId, transaction.patientId),
          eq(patientFinancesTable.clinicId, clinicId),
          inArray(patientFinancesTable.id, transaction.linkedPatientChargeIds), // Use inArray
        ),
        columns: { id: true, dueDate: true },
      });

      for (const charge of chargesToRevert) {
        const isOverdue =
          charge.dueDate && dayjs(charge.dueDate).isBefore(dayjs(), "day");
        await db
          .update(patientFinancesTable)
          .set({
            status: isOverdue ? "overdue" : "pending",
            relatedClinicFinanceId: null,
          })
          .where(eq(patientFinancesTable.id, charge.id));
      }
      await updatePatientFinancialStatus(transaction.patientId, clinicId);
    }
    // If it was a patient credit/advance, delete the corresponding patient payment
    else if (
      transaction.patientId &&
      transaction.operation === "input" &&
      transaction.typeInput === "Crédito/Adiantamento Paciente"
    ) {
      await db
        .delete(patientFinancesTable)
        .where(
          and(
            eq(patientFinancesTable.patientId, transaction.patientId),
            eq(patientFinancesTable.clinicId, clinicId),
            eq(patientFinancesTable.type, "payment"),
            eq(patientFinancesTable.relatedClinicFinanceId, parsedInput.id),
          ),
        );
      await updatePatientFinancialStatus(transaction.patientId, clinicId);
    }

    revalidatePath("/financials");
    if (transaction.patientId)
      revalidatePath(`/patients/${transaction.patientId}/financials`);

    return { success: true };
  });

// Action to mark overdue transactions
export const markOverdueTransactions = actionClient.action(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.clinic?.id)
    throw new Error("Não autorizado ou clínica não encontrada.");
  const clinicId = session.user.clinic.id;
  const today = dayjs().format("YYYY-MM-DD");

  // Update clinic finances
  const clinicUpdateResult = await db
    .update(clinicFinancesTable)
    .set({ status: "overdue" })
    .where(
      and(
        eq(clinicFinancesTable.clinicId, clinicId),
        eq(clinicFinancesTable.status, "pending"),
        lt(clinicFinancesTable.dueDate, today),
      ),
    );

  // Find patients affected by overdue charges *before* updating patient finances
  const affectedPatientIdsResult = await db
    .selectDistinct({ patientId: patientFinancesTable.patientId })
    .from(patientFinancesTable)
    .where(
      and(
        eq(patientFinancesTable.clinicId, clinicId),
        eq(patientFinancesTable.type, "charge"),
        eq(patientFinancesTable.status, "pending"),
        lt(patientFinancesTable.dueDate, today),
      ),
    );
  const affectedPatientIds = affectedPatientIdsResult
    .map((p) => p.patientId)
    .filter((id) => id !== null) as string[];

  // Update patient finances (charges)
  const patientUpdateResult = await db
    .update(patientFinancesTable)
    .set({ status: "overdue" })
    .where(
      and(
        eq(patientFinancesTable.clinicId, clinicId),
        eq(patientFinancesTable.type, "charge"),
        eq(patientFinancesTable.status, "pending"),
        lt(patientFinancesTable.dueDate, today),
      ),
    );

  // Update financial status for all affected patients
  if (affectedPatientIds.length > 0) {
    for (const patientId of affectedPatientIds) {
      await updatePatientFinancialStatus(patientId, clinicId);
    }
  }

  revalidatePath("/financials");
  // Revalidate affected patient pages (optional, could impact performance if many)
  // affectedPatientIds.forEach(id => id && revalidatePath(`/patients/${id}/financials`));

  return {
    clinicUpdated: clinicUpdateResult.rowCount,
    patientsUpdated: patientUpdateResult.rowCount,
  };
});
