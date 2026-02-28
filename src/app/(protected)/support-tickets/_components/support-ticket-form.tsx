// src/app/(protected)/support-tickets/_components/support-ticket-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { createSupportTicket } from "@/actions/support-tickets";
import { createSupportTicketSchema } from "@/actions/support-tickets/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormValues = z.infer<typeof createSupportTicketSchema>;

export default function SupportTicketForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(createSupportTicketSchema),
    defaultValues: {
      subject: "",
      description: "",
    },
  });

  const { execute, isExecuting } = useAction(createSupportTicket, {
    onSuccess: () => {
      toast.success(
        "Chamado aberto com sucesso! Nossa equipe entrará em contato em breve.",
      );
      form.reset(); // Limpa o formulário
    },
    onError: (error) => {
      console.error("Erro ao abrir chamado:", error);
      toast.error(
        error.error.serverError || "Erro ao abrir chamado. Tente novamente.",
      );
    },
  });

  function onSubmit(values: FormValues) {
    execute(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abrir Novo Chamado</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Erro ao salvar agendamento"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o problema ou dúvida com o máximo de detalhes possível..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isExecuting}
              className="w-full sm:w-auto"
            >
              {isExecuting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Abrir Chamado
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
