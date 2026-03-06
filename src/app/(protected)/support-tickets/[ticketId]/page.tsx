// src/app/(protected)/support-tickets/[ticketId]/page.tsx
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSupportTicketThread } from "@/actions/support-tickets";
import { Button } from "@/components/ui/button";
import {
  PageContainer,
  PageContent,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { auth } from "@/lib/auth";

import TicketThreadView from "../_components/ticket-thread-view";

export default async function TicketThreadPage({
  params,
}: {
  params: { ticketId: string };
}) {
  const { ticketId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/authentication");

  const result = await getSupportTicketThread({ ticketId });

  if (!result?.data) return notFound();

  return (
    <PageContainer>
      <PageHeader>
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/support-tickets">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para chamados
            </Link>
          </Button>
        </div>
        <PageHeaderContent>
          <PageTitle>{result.data.ticket.subject}</PageTitle>
        </PageHeaderContent>
      </PageHeader>
      <PageContent>
        <TicketThreadView
          initialData={result.data}
          currentUserId={session.user.id}
        />
      </PageContent>
    </PageContainer>
  );
}
