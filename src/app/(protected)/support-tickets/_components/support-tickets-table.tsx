"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Send } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import React from "react";
import { toast } from "sonner";

import {
  getSupportTicketThread,
  replyToSupportTicket,
  SupportTicketListItem,
  SupportTicketMessage,
} from "@/actions/support-tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SupportTicketsTableProps {
  data: SupportTicketListItem[];
  currentUserId: string;
}

const getStatusProps = (status: SupportTicketListItem["status"]) => {
  switch (status) {
    case "pending":
    case "aguardando":
    case "Aberto":
      return {
        label: "Aberto",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    case "in_progress":
    case "em_atendimento":
    case "Em Atendimento":
      return {
        label: "Respondido",
        color: "bg-blue-100 text-blue-800 border-blue-300",
      };
    case "resolved":
    case "concluido":
    case "Resolvido":
      return {
        label: "Finalizado",
        color: "bg-green-100 text-green-800 border-green-300",
      };
    case "Cancelado":
      return {
        label: "Cancelado",
        color: "bg-gray-100 text-gray-800 border-gray-300",
      };
    default:
      return {
        label: status,
        color: "bg-gray-100 text-gray-800 border-gray-300",
      };
  }
};

export default function SupportTicketsTable({
  data,
  currentUserId,
}: SupportTicketsTableProps) {
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(
    data[0]?.id ?? null,
  );
  const [messages, setMessages] = React.useState<SupportTicketMessage[]>([]);
  const [messageInput, setMessageInput] = React.useState("");

  const selectedTicket = React.useMemo(
    () => data.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [data, selectedTicketId],
  );

  const loadThreadAction = useAction(getSupportTicketThread, {
    onSuccess: ({ data: payload }) => {
      setMessages(payload?.messages ?? []);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao carregar mensagens do chamado.");
      setMessages([]);
    },
  });

  const replyAction = useAction(replyToSupportTicket, {
    onSuccess: async () => {
      setMessageInput("");
      toast.success("Mensagem enviada com sucesso.");

      if (!selectedTicketId) return;

      await loadThreadAction.executeAsync({ ticketId: selectedTicketId });
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Nao foi possivel enviar a mensagem.");
    },
  });

  const loadThread = loadThreadAction.executeAsync;

  React.useEffect(() => {
    if (!selectedTicketId) return;
    void loadThread({ ticketId: selectedTicketId });
  }, [selectedTicketId, loadThread]);

  const handleSendMessage = () => {
    if (!selectedTicketId) return;
    const content = messageInput.trim();

    if (content.length < 2) {
      toast.error("Digite uma mensagem com pelo menos 2 caracteres.");
      return;
    }

    replyAction.execute({
      ticketId: selectedTicketId,
      content,
    });
  };

  if (data.length === 0) {
    return (
      <div className="mt-6 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Nenhum chamado encontrado para o usuario logado.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meus Chamados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.map((ticket) => {
            const status = getStatusProps(ticket.status);
            const isSelected = ticket.id === selectedTicketId;

            return (
              <button
                key={ticket.id}
                type="button"
                className={cn(
                  "w-full rounded-md border p-3 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50 border-border",
                )}
                onClick={() => setSelectedTicketId(ticket.id)}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-medium">{ticket.subject}</p>
                  <Badge variant="outline" className={cn(status.color)}>
                    {status.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {ticket.description}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {format(new Date(ticket.updatedAt), "dd/MM/yyyy HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span>{selectedTicket?.subject ?? "Selecione um chamado"}</span>
            {selectedTicket ? (
              <Badge
                variant="outline"
                className={cn(getStatusProps(selectedTicket.status).color)}
              >
                {getStatusProps(selectedTicket.status).label}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <ScrollArea className="h-[360px] rounded-md border p-4">
            {loadThreadAction.isExecuting ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma mensagem neste chamado.</p>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isUserMessage = message.userId === currentUserId;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "max-w-[85%] rounded-md border p-3 text-sm",
                        isUserMessage
                          ? "ml-auto border-primary/30 bg-primary/10"
                          : "mr-auto border-border bg-muted/40",
                      )}
                    >
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        {isUserMessage ? "Voce" : "Suporte"}
                      </p>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {format(new Date(message.createdAt), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="space-y-3">
            <Textarea
              rows={4}
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Digite sua mensagem para o suporte..."
              disabled={!selectedTicket || replyAction.isExecuting}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSendMessage}
                disabled={!selectedTicket || replyAction.isExecuting}
              >
                {replyAction.isExecuting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                Enviar resposta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
