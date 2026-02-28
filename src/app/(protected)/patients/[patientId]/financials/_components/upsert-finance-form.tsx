// src/app/(protected)/patients/[patientId]/financials/_components/upsert-finance-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";
import { z } from "zod";

import { upsertFinance } from "@/actions/patient-finances";
import { upsertFinanceSchema } from "@/actions/patient-finances/schema"; // Schema já omite patientId
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { patientFinancesTable } from "@/db/schema";
import { cn } from "@/lib/utils";

type FinanceEntry = typeof patientFinancesTable.$inferSelect;

interface UpsertFinanceFormProps {
  patientId: string;
  entry?: FinanceEntry;
  onSuccess?: () => void;
}

// O schema já omite patientId, então podemos usá-lo diretamente
const formSchema = upsertFinanceSchema.omit({ patientId: true });
type FormValues = z.infer<typeof formSchema>;

export default function UpsertFinanceForm({
  patientId,
  entry,
  onSuccess,
}: UpsertFinanceFormProps) {
  const queryClient = useQueryClient();

  // *** CORREÇÃO APLICADA AQUI ***
  // Mapeia 'overdue' para 'pending' no defaultValues
  const initialStatus =
    entry?.status === "overdue" ? "pending" : (entry?.status ?? "pending");
  // *** FIM DA CORREÇÃO ***

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: entry?.id,
      type: entry?.type ?? "charge",
      amount: entry ? entry.amountInCents / 100 : 0,
      description: entry?.description ?? "",
      method: entry?.method ?? "",
      dueDate: entry?.dueDate ? new Date(entry.dueDate) : undefined,
      status: initialStatus, // Usa o status inicial ajustado
    },
  });

  const { execute, isExecuting } = useAction(upsertFinance, {
    onSuccess: () => {
      toast.success("Lançamento financeiro salvo com sucesso.");
      queryClient.invalidateQueries({
        queryKey: ["patient-finances", patientId],
      });
      onSuccess?.();
    },
    onError: () => {
      toast.error("Erro ao salvar lançamento financeiro.");
    },
  });

  function onSubmit(values: FormValues) {
    execute({
      ...values,
      patientId,
    });
  }

  const type = form.watch("type");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {entry ? "Editar Lançamento" : "Adicionar Lançamento"}
        </DialogTitle>
        <DialogDescription>
          Preencha os detalhes da cobrança ou pagamento.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="charge">Cobrança</SelectItem>
                    <SelectItem value="payment">Pagamento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor</FormLabel>
                <FormControl>
                  <NumericFormat
                    customInput={Input}
                    thousandSeparator="."
                    decimalSeparator=","
                    prefix="R$ "
                    decimalScale={2}
                    fixedDecimalScale
                    value={field.value}
                    onValueChange={(values) =>
                      field.onChange(values.floatValue)
                    }
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
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex: Consulta, Procedimento X..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {type === "payment" && (
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pagamento</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao_credito">
                        Cartão de Crédito
                      </SelectItem>
                      <SelectItem value="cartao_debito">
                        Cartão de Débito
                      </SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transferencia">
                        Transferência Bancária
                      </SelectItem>
                      {/* Adicione outros métodos conforme necessário */}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {type === "charge" && (
            <>
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Vencimento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status da Cobrança</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      // Garante que o valor passado seja 'pending' ou 'paid'
                      value={field.value ?? "pending"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Paga</SelectItem>
                        {/* Não inclui 'overdue' como opção selecionável */}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
