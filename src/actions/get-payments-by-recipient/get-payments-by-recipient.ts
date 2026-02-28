// src/actions/get-payments-by-recipient.ts
"use server"; // <-- Ensure this is the first line

import dayjs from "dayjs";
import { and, desc, eq, gte, lte, SQL } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { clinicFinancesTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

// Import the schema from the SAME directory
import { getPaymentsByRecipientSchema } from "./schema"; // <-- Path relative to this file

export const getPaymentsByRecipient = actionClient
  .schema(getPaymentsByRecipientSchema) // Use the imported schema
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const { recipientId, from, to } = parsedInput;
    const clinicId = session.user.clinic.id;

    const conditions: (SQL | undefined)[] = [
      eq(clinicFinancesTable.clinicId, clinicId),
      eq(clinicFinancesTable.employeeId, recipientId), // Filtra pelo ID do funcionário/médico
      eq(clinicFinancesTable.operation, "output"), // Apenas saídas (pagamentos)
      eq(clinicFinancesTable.status, "paid"), // Apenas pagamentos efetivados
    ];

    // Adiciona filtro de data se fornecido
    if (from) {
      conditions.push(
        gte(
          clinicFinancesTable.paymentDate,
          dayjs(from).startOf("day").toDate(),
        ),
      );
    }
    if (to) {
      conditions.push(
        lte(clinicFinancesTable.paymentDate, dayjs(to).endOf("day").toDate()),
      );
    }

    const payments = await db.query.clinicFinancesTable.findMany({
      where: and(...conditions),
      orderBy: desc(clinicFinancesTable.paymentDate), // Ordena pelos mais recentes
      // Não precisamos de 'with' aqui, pois já temos o ID do recebedor
    });

    return payments;
  });
