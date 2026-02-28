// src/actions/support-tickets/index.ts
"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { supportTicketsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email"; // Importar sendEmail
import { actionClient } from "@/lib/next-safe-action";

import { createSupportTicketSchema } from "./schema";

// Action para criar um novo chamado
export const createSupportTicket = actionClient
  .schema(createSupportTicketSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !session.user.clinic?.id) {
      throw new Error("Não autorizado ou clínica não encontrada.");
    }

    const clinicId = session.user.clinic.id;
    const userId = session.user.id;

    const [newTicket] = await db
      .insert(supportTicketsTable)
      .values({
        clinicId,
        userId,
        subject: parsedInput.subject,
        description: parsedInput.description,
        status: "pending", // Status inicial
      })
      .returning();

    // Enviar notificação por email
    if (process.env.SUPPORT_EMAIL && newTicket) {
      const emailSubject = `Novo Chamado #${newTicket.id}: ${newTicket.subject}`;
      const emailText = `Novo chamado aberto por ${session.user.email} (Clínica ID: ${clinicId}).\n\nAssunto: ${newTicket.subject}\n\nDescrição:\n${newTicket.description}`;
      const emailHtml = `
        <p>Novo chamado aberto por <strong>${session.user.email}</strong> (Clínica ID: ${clinicId}).</p>
        <p><strong>Assunto:</strong> ${newTicket.subject}</p>
        <p><strong>Descrição:</strong></p>
        <p>${newTicket.description.replace(/\n/g, "<br>")}</p>
        <hr>
        <p>ID do Chamado: ${newTicket.id}</p>
      `;

      await sendEmail({
        to: process.env.SUPPORT_EMAIL,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });
    }

    revalidatePath("/support-tickets"); // Revalida a página de chamados
    return { success: true, ticketId: newTicket.id };
  });

// Action para buscar os chamados da clínica
export const getSupportTickets = actionClient.action(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || !session.user.clinic?.id) {
    throw new Error("Não autorizado ou clínica não encontrada.");
  }

  const tickets = await db.query.supportTicketsTable.findMany({
    where: eq(supportTicketsTable.clinicId, session.user.clinic.id),
    orderBy: [desc(supportTicketsTable.createdAt)],
    with: {
      user: {
        // Inclui dados do usuário que abriu
        columns: { name: true, email: true },
      },
    },
  });

  return tickets;
});
