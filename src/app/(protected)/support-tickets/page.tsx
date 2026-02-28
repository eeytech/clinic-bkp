// src/app/(protected)/support-tickets/page.tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { getSupportTickets } from "@/actions/support-tickets"; // Importar a action
import {
  PageContainer,
  PageContent,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { auth } from "@/lib/auth";

import SupportTicketForm from "./_components/support-ticket-form";
import SupportTicketsTable from "./_components/support-tickets-table";

export default async function SupportTicketsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/authentication");
  }
  if (!session.user.clinic) {
    redirect("/clinic");
  }
  if (!session.user.plan) {
    redirect("/new-subscription");
  }

  // Buscar os chamados existentes
  const ticketsResult = await getSupportTickets();
  const tickets = ticketsResult?.data ?? []; // Pega os dados ou um array vazio

  return (
    <PageContainer>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>Abertura de Chamados</PageTitle>
          <PageDescription>
            Precisa de ajuda? Abra um chamado e nossa equipe de suporte entrará
            em contato.
          </PageDescription>
        </PageHeaderContent>
      </PageHeader>
      <PageContent>
        {/* Formulário para abrir chamado */}
        <SupportTicketForm />

        {/* Tabela de chamados existentes */}
        <SupportTicketsTable data={tickets} />
      </PageContent>
    </PageContainer>
  );
}
