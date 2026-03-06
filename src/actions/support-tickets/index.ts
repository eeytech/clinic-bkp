"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/next-safe-action";

import {
  createSupportTicketSchema,
  replySupportTicketSchema,
  supportTicketThreadSchema,
} from "./schema";

type AdminTicketStatus =
  | "aguardando"
  | "em_atendimento"
  | "concluido"
  | "pending"
  | "in_progress"
  | "resolved"
  | "Aberto"
  | "Em Atendimento"
  | "Resolvido"
  | "Cancelado";

export type SupportTicketListItem = {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: AdminTicketStatus;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

export type SupportTicketMessage = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  authorName: string | null;
  authorEmail: string | null;
  source: "user" | "support";
};

export type SupportTicketThread = {
  ticket: SupportTicketListItem;
  messages: SupportTicketMessage[];
};

type AdminTicketsApiResponseItem = {
  id: string;
  userId?: string | null;
  title?: string | null;
  subject?: string | null;
  description?: string | null;
  status?: AdminTicketStatus | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
};

type AdminTicketMessageApiResponseItem = {
  id?: string | null;
  content?: string | null;
  createdAt?: string | null;
  userId?: string | null;
  source?: "user" | "support" | null;
  user?: {
    id?: string | null;
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

const getSessionContext = async () => {
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

  return {
    session,
    token,
    clinicId,
    userId: session.user.id,
  };
};

const mapTicket = (ticket: AdminTicketsApiResponseItem): SupportTicketListItem => ({
  id: String(ticket.id),
  userId: String(ticket.userId ?? ticket.user?.id ?? ""),
  subject: String(ticket.title ?? ticket.subject ?? ""),
  description: String(ticket.description ?? ""),
  status: (ticket.status ?? "aguardando") as AdminTicketStatus,
  createdAt: String(ticket.createdAt ?? new Date().toISOString()),
  updatedAt: String(ticket.updatedAt ?? ticket.createdAt ?? new Date().toISOString()),
  user: ticket.user
    ? {
        id: String(ticket.user.id ?? ticket.userId ?? ""),
        name: ticket.user.name ?? null,
        email: ticket.user.email ?? null,
      }
    : null,
});

const getUserTicketById = async (params: {
  adminApiUrl: string;
  token: string;
  userId: string;
  ticketId: string;
}): Promise<SupportTicketListItem> => {
  const response = await fetch(
    `${params.adminApiUrl}/api/tickets?userId=${encodeURIComponent(params.userId)}&q=${encodeURIComponent(params.ticketId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.error || "Erro ao validar chamado.");
  }

  const tickets = (Array.isArray(data) ? data : []) as AdminTicketsApiResponseItem[];
  const target = tickets.find((ticket) => String(ticket.id) === params.ticketId);

  if (!target) {
    throw new Error("Chamado nao encontrado para o usuario logado.");
  }

  const mapped = mapTicket(target);
  const ownerId = mapped.userId || mapped.user?.id;

  if (!ownerId || ownerId !== params.userId) {
    throw new Error("Acesso negado ao chamado.");
  }

  return mapped;
};

export const createSupportTicket = actionClient
  .schema(createSupportTicketSchema)
  .action(async ({ parsedInput }) => {
    const { session, token, clinicId } = await getSessionContext();
    const { adminApiUrl, internalKey } = getAdminConnectionConfig();

    const payload = {
      applicationId: session.user.applicationId,
      companyId: clinicId,
      userId: session.user.id,
      title: parsedInput.subject,
      description: parsedInput.description,
    };

    const response = await fetch(`${adminApiUrl}/api/internal/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": internalKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
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
  const { token, userId } = await getSessionContext();
  const { adminApiUrl } = getAdminConnectionConfig();

  const response = await fetch(
    `${adminApiUrl}/api/tickets?userId=${encodeURIComponent(userId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data?.error || "Erro ao buscar chamados no sistema central.");
  }

  const tickets = (Array.isArray(data) ? data : []) as AdminTicketsApiResponseItem[];

  return tickets
    .map(mapTicket)
    .filter((ticket) => {
      const ownerId = ticket.userId || ticket.user?.id;
      return ownerId === userId;
    }) as SupportTicketListItem[];
});

export const getSupportTicketThread = actionClient
  .schema(supportTicketThreadSchema)
  .action(async ({ parsedInput }) => {
    const { token, userId } = await getSessionContext();
    const { adminApiUrl } = getAdminConnectionConfig();

    const ticket = await getUserTicketById({
      adminApiUrl,
      token,
      userId,
      ticketId: parsedInput.ticketId,
    });

    const response = await fetch(
      `${adminApiUrl}/api/tickets/${parsedInput.ticketId}/messages`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    let messages: SupportTicketMessage[] = [];

    if (response.ok) {
      const data = await response.json().catch(() => []);
      console.dir(
        {
          scope: "getSupportTicketThread",
          ticketId: parsedInput.ticketId,
          responseStatus: response.status,
          data,
        },
        { depth: null },
      );

      const rawMessages = (Array.isArray(data)
        ? data
        : []) as AdminTicketMessageApiResponseItem[];

      messages = rawMessages.map((message, index) => {
        const authorId = String(message.userId ?? message.user?.id ?? "");
        const isFromUser = authorId === String(userId);

        return {
          id: String(message.id ?? `${parsedInput.ticketId}-${index}`),
          content: String(message.content ?? ""),
          createdAt: String(message.createdAt ?? new Date().toISOString()),
          userId: authorId,
          authorName: message.user?.name ?? null,
          authorEmail: message.user?.email ?? null,
          source: isFromUser ? "user" : "support",
        } satisfies SupportTicketMessage;
      });
    }

    if (messages.length === 0) {
      messages = [
        {
          id: `${parsedInput.ticketId}-initial`,
          content: ticket.description,
          createdAt: ticket.createdAt,
          userId,
          authorName: ticket.user?.name ?? null,
          authorEmail: ticket.user?.email ?? null,
          source: "user",
        },
      ];
    }

    return {
      ticket,
      messages,
    } satisfies SupportTicketThread;
  });

export const replyToSupportTicket = actionClient
  .schema(replySupportTicketSchema)
  .action(async ({ parsedInput }) => {
    const { token, userId } = await getSessionContext();
    const { adminApiUrl } = getAdminConnectionConfig();

    await getUserTicketById({
      adminApiUrl,
      token,
      userId,
      ticketId: parsedInput.ticketId,
    });

    try {
      const endpoint = `${adminApiUrl}/api/tickets/${parsedInput.ticketId}/messages`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: parsedInput.content }),
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const isAuthError = response.status === 401 || response.status === 403;
        console.error("replyToSupportTicket Debug - HTTP error", {
          ticketId: parsedInput.ticketId,
          endpoint,
          status: response.status,
          isAuthError,
          hasToken: Boolean(token),
          responseData: data,
        });

        throw new Error(
          data?.error ||
            (isAuthError
              ? "Erro de autenticacao ao enviar resposta."
              : "Erro ao enviar mensagem para o chamado."),
        );
      }

      revalidatePath("/support-tickets");
      return {
        success: true,
        ticketId: parsedInput.ticketId,
        messageId: String(data?.message?.id ?? ""),
      };
    } catch (error) {
      const endpoint = `${adminApiUrl}/api/tickets/${parsedInput.ticketId}/messages`;
      const isNetworkOrUrlError = error instanceof TypeError;
      console.error("replyToSupportTicket Debug - request failed", {
        ticketId: parsedInput.ticketId,
        endpoint,
        hasToken: Boolean(token),
        isNetworkOrUrlError,
        error,
      });
      throw error;
    }
  });
