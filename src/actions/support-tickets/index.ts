"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import { createSupportTicketSchema } from "./schema";

type AdminTicketStatus =
  | "aguardando"
  | "em_atendimento"
  | "concluido"
  | "pending"
  | "in_progress"
  | "resolved";

export type SupportTicketListItem = {
  id: string;
  subject: string;
  description: string;
  status: AdminTicketStatus;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string | null;
    email: string | null;
  } | null;
};

type AdminTicketsApiResponseItem = {
  id: string;
  title?: string | null;
  subject?: string | null;
  description?: string | null;
  status?: AdminTicketStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

const getCookieValueFromHeader = (
  cookieHeader: string | null,
  key: string,
): string | null => {
  if (!cookieHeader) return null;

  const cookieEntries = cookieHeader.split(";");
  for (const entry of cookieEntries) {
    const [rawName, ...rest] = entry.trim().split("=");
    if (rawName !== key) continue;
    return decodeURIComponent(rest.join("="));
  }

  return null;
};

const getAdminConnectionConfig = () => {
  const adminApiUrl = process.env.NEXT_PUBLIC_ADMIN_API_URL;
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!adminApiUrl) {
    throw new Error("NEXT_PUBLIC_ADMIN_API_URL nao configurada.");
  }

  if (!internalKey) {
    throw new Error("INTERNAL_API_KEY nao configurada.");
  }

  return { adminApiUrl, internalKey };
};

export const createSupportTicket = actionClient
  .schema(createSupportTicketSchema)
  .action(async ({ parsedInput }) => {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    const cookieStore = await cookies();
    const token =
      cookieStore.get("auth_token")?.value ??
      getCookieValueFromHeader(requestHeaders.get("cookie"), "auth_token");

    const clinicId =
      session?.user?.clinic?.id ??
      session?.user?.activeClinicId ??
      session?.user?.activeCompanyId ??
      session?.user?.clinics?.[0]?.id ??
      session?.user?.companies?.[0]?.id;

    if (!session?.user || !clinicId) {
      throw new Error("Nao autorizado ou clinica nao encontrada.");
    }
    if (!token) {
      throw new Error("Sessao invalida.");
    }

    const { adminApiUrl, internalKey } = getAdminConnectionConfig();

    const response = await fetch(`${adminApiUrl}/api/internal/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": internalKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        applicationId: session.user.applicationId,
        companyId: clinicId,
        userId: session.user.id,
        title: parsedInput.subject,
        description: parsedInput.description,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Erro ao abrir chamado no sistema central.");
    }

    revalidatePath("/support-tickets");
    return { success: true, ticketId: String(data.ticketId ?? "") };
  });

export const getSupportTickets = actionClient.action(async () => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const clinicId =
    session?.user?.clinic?.id ??
    session?.user?.activeClinicId ??
    session?.user?.activeCompanyId ??
    session?.user?.clinics?.[0]?.id ??
    session?.user?.companies?.[0]?.id;

  if (!session?.user || !clinicId) {
    throw new Error("Nao autorizado ou clinica nao encontrada.");
  }

  const { adminApiUrl } = getAdminConnectionConfig();
  const cookieStore = await cookies();
  const token =
    cookieStore.get("auth_token")?.value ??
    getCookieValueFromHeader(requestHeaders.get("cookie"), "auth_token");

  if (!token) {
    throw new Error("Sessao invalida.");
  }

  const response = await fetch(`${adminApiUrl}/api/tickets`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.error || "Erro ao buscar chamados no sistema central.");
  }

  const tickets = Array.isArray(data)
    ? (data as AdminTicketsApiResponseItem[])
    : [];

  return tickets.map((ticket) => ({
    id: String(ticket.id),
    subject: String(ticket.title ?? ticket.subject ?? ""),
    description: String(ticket.description ?? ""),
    status: (ticket.status ?? "aguardando") as AdminTicketStatus,
    createdAt: String(ticket.createdAt ?? new Date().toISOString()),
    updatedAt: String(ticket.updatedAt ?? ticket.createdAt ?? new Date().toISOString()),
    user: ticket.user
      ? {
          name: ticket.user.name ?? null,
          email: ticket.user.email ?? null,
        }
      : null,
  })) as SupportTicketListItem[];
});
