// src/app/(protected)/support-tickets/_components/ticket-thread-view.tsx
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
  SupportTicketThread,
  SupportTicketMessage,
} from "@/actions/support-tickets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function TicketThreadView({
  initialData,
  currentUserId,
}: {
  initialData: SupportTicketThread;
  currentUserId: string;
}) {
  const [messages, setMessages] = React.useState<SupportTicketMessage[]>(
    initialData.messages,
  );
  const [messageInput, setMessageInput] = React.useState("");

  const loadThreadAction = useAction(getSupportTicketThread, {
    onSuccess: ({ data }) => {
      if (data?.messages) setMessages(data.messages);
    },
  });

  const replyAction = useAction(replyToSupportTicket, {
    onSuccess: () => {
      setMessageInput("");
      toast.success("Mensagem enviada.");
      loadThreadAction.execute({ ticketId: initialData.ticket.id });
    },
    onError: () => toast.error("Erro ao enviar mensagem."),
  });

  const handleSendMessage = () => {
    if (messageInput.trim().length < 2) return;
    replyAction.execute({
      ticketId: initialData.ticket.id,
      content: messageInput,
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-sm font-medium">
            Descrição Original
          </CardTitle>
          <Badge variant="outline">{initialData.ticket.status}</Badge>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {initialData.ticket.description}
          </p>
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="text-base">Conversa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[450px] rounded-md border p-4">
            <div className="space-y-4">
              {messages.map((message) => {
                const isUser = message.userId === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "max-w-[80%] rounded-lg p-3 text-sm",
                      isUser
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted mr-auto border",
                    )}
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase opacity-70">
                      {isUser ? "Você" : "Suporte"}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="mt-2 text-right text-[10px] opacity-50">
                      {format(
                        new Date(message.createdAt),
                        "HH:mm '•' dd/MM/yy",
                        { locale: ptBR },
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex items-start gap-2">
            <Textarea
              placeholder="Digite sua resposta..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              className="h-[100px] w-[100px]"
              disabled={replyAction.isExecuting}
              onClick={handleSendMessage}
            >
              {replyAction.isExecuting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
