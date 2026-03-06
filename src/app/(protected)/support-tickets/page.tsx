import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

import { getSupportTickets } from "@/actions/support-tickets";
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
  // Verifica a sessão e permissões do usuário
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/authentication");
  }

  if (!session.user.clinic) {
    redirect("/clinic");
  }

  // Busca os chamados vinculados ao usuário logado através da Server Action
  const ticketsResult = await getSupportTickets();
  const tickets = ticketsResult?.data ?? [];

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

      <PageContent className="space-y-8">
        {/* Seção superior: Formulário de abertura */}
        <div className="max-w-4xl">
          <SupportTicketForm />
        </div>

        {/* Seção inferior: Listagem de chamados existentes */}
        <SupportTicketsTable data={tickets} />
      </PageContent>
    </PageContainer>
  );
}
