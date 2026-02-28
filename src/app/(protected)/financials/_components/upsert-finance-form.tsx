// src/app/(protected)/financials/_components/upsert-finance-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Check, Info, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import React, { useEffect, useState } from "react";
// Importar z para usar z.input
import { useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";
import { z } from "zod"; // Importar z

import { upsertClinicFinance } from "@/actions/clinic-finances";
import {
  ClinicFinanceSchema,
  clinicFinanceSchema,
} from "@/actions/clinic-finances/schema";
import { getPatientFinances } from "@/actions/patient-finances";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  clinicFinancesTable,
  clinicPaymentMethodsEnum,
  employeesTable,
  patientsTable,
} from "@/db/schema";
import { formatCurrencyInCents } from "@/helpers/currency";
import { cn } from "@/lib/utils";

import {
  clinicFinancialOperations,
  clinicFinancialStatuses,
  clinicFinancialTypesInput,
  clinicFinancialTypesOutput,
} from "../index";

// Tipos permanecem os mesmos
type FinanceEntry = typeof clinicFinancesTable.$inferSelect & {
  patient?: { id: string; name: string } | null;
  employee?: { id: string; name: string } | null;
};
type SelectOption = { id: string; name: string };
interface UpsertFinanceFormProps {
  entry?: FinanceEntry;
  onSuccess?: () => void;
  patients: SelectOption[];
  employeesAndDoctors: SelectOption[];
}

const valueToCents = (value: number | undefined | null): number => {
  if (value === null || value === undefined) return 0;
  return Math.round(value * 100);
};

const centsToValue = (cents: number | undefined | null): number => {
  if (cents === null || cents === undefined) return 0;
  return cents / 100;
};

const clinicPaymentMethods = clinicPaymentMethodsEnum.enumValues.map(
  (value) => ({
    value,
    label: value,
  }),
);

// Define o tipo de entrada do schema Zod
type ClinicFinanceInputSchema = z.input<typeof clinicFinanceSchema>;

export default function UpsertFinanceForm({
  entry,
  onSuccess,
  patients = [],
  employeesAndDoctors = [],
}: UpsertFinanceFormProps) {
  const queryClient = useQueryClient();
  const [selectedPatientCharges, setSelectedPatientCharges] = useState<
    number[]
  >(entry?.linkedPatientChargeIds ?? []);

  const initialStatus =
    entry?.status === "overdue" || entry?.status === "refunded"
      ? "pending"
      : (entry?.status ?? "pending");

  // defaultValues pode usar o tipo de entrada também, mas precisa garantir que status tenha um valor
  const defaultValues: Partial<ClinicFinanceInputSchema> = {
    // Usar Partial para flexibilidade inicial
    id: entry?.id,
    operation: entry?.operation ?? "input",
    typeInput: entry?.typeInput ?? undefined,
    typeOutput: entry?.typeOutput ?? undefined,
    description: entry?.description ?? "",
    amount: centsToValue(entry?.amountInCents),
    paymentDate: entry?.paymentDate ? new Date(entry.paymentDate) : undefined,
    dueDate: entry?.dueDate ? new Date(entry.dueDate) : undefined,
    status: initialStatus, // Garante que status está definido
    paymentMethod: entry?.paymentMethod ?? undefined,
    observations: entry?.observations ?? "",
    patientId: entry?.patientId ?? undefined,
    employeeId: entry?.employeeId ?? undefined,
    linkedPatientChargeIds: entry?.linkedPatientChargeIds ?? [],
  };

  // *** ALTERAÇÃO PRINCIPAL AQUI ***
  // Usar z.input<typeof clinicFinanceSchema> como tipo genérico para useForm
  const form = useForm<ClinicFinanceInputSchema>({
    // *** FIM DA ALTERAÇÃO ***
    resolver: zodResolver(clinicFinanceSchema),
    defaultValues: defaultValues,
    mode: "onBlur",
  });

  const watchedOperation = form.watch("operation");
  const watchedTypeInput = form.watch("typeInput");
  const watchedTypeOutput = form.watch("typeOutput");
  const watchedPatientId = form.watch("patientId");
  const watchedStatus = form.watch("status");

  // ... restante do componente permanece igual ...
  // Busca as cobranças pendentes do paciente selecionado
  const { data: patientChargesData, isLoading: isLoadingPatientCharges } =
    useQuery({
      queryKey: ["patient-charges", watchedPatientId],
      queryFn: async () => {
        if (!watchedPatientId) return [];
        const result = await getPatientFinances({
          patientId: watchedPatientId,
        });
        // Certifica que result.data existe e é um array antes de filtrar
        return (result?.data ?? []).filter(
          (charge: any) => charge.type === "charge" && charge.status !== "paid",
        );
      },
      enabled:
        !!watchedPatientId &&
        watchedOperation === "input" &&
        (watchedTypeInput === "Recebimento Consulta" ||
          watchedTypeInput === "Recebimento Procedimento" ||
          watchedTypeInput === "Recebimento Pacote"),
    });

  // Calcular valor total das cobranças selecionadas
  useEffect(() => {
    if (
      watchedOperation === "input" &&
      (watchedTypeInput === "Recebimento Consulta" ||
        watchedTypeInput === "Recebimento Procedimento" ||
        watchedTypeInput === "Recebimento Pacote") &&
      patientChargesData
    ) {
      const totalSelectedAmount = selectedPatientCharges.reduce(
        (sum, chargeId) => {
          const charge = patientChargesData.find((c: any) => c.id === chargeId);
          return sum + (charge?.amountInCents || 0);
        },
        0,
      );
      form.setValue("amount", centsToValue(totalSelectedAmount), {
        shouldValidate: true,
      });
      form.setValue("linkedPatientChargeIds", selectedPatientCharges);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedPatientCharges,
    patientChargesData,
    watchedOperation,
    watchedTypeInput,
  ]);

  const { execute, isExecuting } = useAction(upsertClinicFinance, {
    onSuccess: () => {
      toast.success("Lançamento salvo com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["clinic-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["clinic-finance-summary"] });
      if (
        watchedPatientId &&
        watchedOperation === "input" &&
        (watchedTypeInput === "Recebimento Consulta" ||
          watchedTypeInput === "Recebimento Procedimento" ||
          watchedTypeInput === "Recebimento Pacote")
      ) {
        queryClient.invalidateQueries({
          queryKey: ["patient-finances", watchedPatientId],
        });
        queryClient.invalidateQueries({
          queryKey: ["patient-charges", watchedPatientId],
        });
      }
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Erro ao salvar:", error);
      toast.error(error.error.serverError || "Erro ao salvar lançamento.");
    },
  });

  function onSubmit(values: ClinicFinanceInputSchema) {
    // Agora espera o tipo de entrada
    // O Zod resolver irá aplicar o default e validar,
    // então podemos passar `values` diretamente (ou quase)
    const submitValues = {
      ...values,
      amount: Number(values.amount) || 0,
      patientId:
        values.operation === "input" && values.patientId
          ? values.patientId
          : null,
      employeeId:
        values.operation === "output" && values.employeeId
          ? values.employeeId
          : null,
      linkedPatientChargeIds:
        values.operation === "input" &&
        values.linkedPatientChargeIds &&
        values.linkedPatientChargeIds.length > 0
          ? values.linkedPatientChargeIds
          : null,
      typeInput: values.operation === "input" ? values.typeInput : undefined,
      typeOutput: values.operation === "output" ? values.typeOutput : undefined,
      paymentMethod: values.status === "paid" ? values.paymentMethod : null,
      // Status: Se 'undefined' aqui (porque é opcional no Input), o Zod aplicará o default 'pending'
      status: values.status ?? "pending", // Garante que nunca seja undefined ao submeter
    };
    execute(submitValues as ClinicFinanceSchema); // Faz cast para o tipo de saída esperado pela action
  }

  const handleChargeSelection = (chargeId: number) => {
    setSelectedPatientCharges((prevSelected) => {
      const newSelected = prevSelected.includes(chargeId)
        ? prevSelected.filter((id) => id !== chargeId)
        : [...prevSelected, chargeId];
      form.setValue("linkedPatientChargeIds", newSelected);
      return newSelected;
    });
  };

  useEffect(() => {
    const resetConditionalFields = (
      operation: ClinicFinanceInputSchema["operation"] | undefined,
    ) => {
      // ... (lógica existente para resetar campos) ...
      if (operation === "input") {
        form.setValue("typeOutput", undefined);
        form.setValue("employeeId", null);
        if (
          watchedTypeInput !== "Recebimento Consulta" &&
          watchedTypeInput !== "Recebimento Procedimento" &&
          watchedTypeInput !== "Recebimento Pacote" &&
          watchedTypeInput !== "Crédito/Adiantamento Paciente"
        ) {
          form.setValue("patientId", null);
          form.setValue("linkedPatientChargeIds", []);
          setSelectedPatientCharges([]);
        }
      } else if (operation === "output") {
        form.setValue("typeInput", undefined);
        form.setValue("patientId", null);
        form.setValue("linkedPatientChargeIds", []);
        setSelectedPatientCharges([]);
        if (watchedTypeOutput !== "Pagamento Funcionário") {
          form.setValue("employeeId", null);
        }
      } else {
        form.setValue("typeInput", undefined);
        form.setValue("typeOutput", undefined);
        form.setValue("patientId", null);
        form.setValue("employeeId", null);
        form.setValue("linkedPatientChargeIds", []);
        setSelectedPatientCharges([]);
      }
    };
    resetConditionalFields(watchedOperation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedOperation]);

  useEffect(() => {
    if (watchedOperation === "input") {
      if (
        watchedTypeInput !== "Recebimento Consulta" &&
        watchedTypeInput !== "Recebimento Procedimento" &&
        watchedTypeInput !== "Recebimento Pacote" &&
        watchedTypeInput !== "Crédito/Adiantamento Paciente" &&
        form.getValues("patientId")
      ) {
        form.setValue("patientId", null);
        form.setValue("linkedPatientChargeIds", []);
        setSelectedPatientCharges([]);
      } else if (watchedTypeInput === "Crédito/Adiantamento Paciente") {
        form.setValue("linkedPatientChargeIds", []);
        setSelectedPatientCharges([]);
      }
    } else if (watchedOperation === "output") {
      if (
        watchedTypeOutput !== "Pagamento Funcionário" &&
        form.getValues("employeeId")
      ) {
        form.setValue("employeeId", null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTypeInput, watchedTypeOutput, watchedOperation]);

  const availableStatuses = clinicFinancialStatuses.filter(
    (s) => s.value !== "overdue" && s.value !== "refunded",
  );

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          {entry ? "Editar Lançamento" : "Adicionar Lançamento"}
        </DialogTitle>
        <DialogDescription>
          Preencha os detalhes da transação financeira da clínica.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-h-[70vh] space-y-4 overflow-y-auto pr-4 pl-1"
        >
          {/* Operação (Entrada/Saída) */}
          <FormField
            control={form.control}
            name="operation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Operação</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value} // Valor direto do field
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a operação" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clinicFinancialOperations.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tipo (Condicional à Operação) */}
          {watchedOperation === "input" && (
            <FormField
              control={form.control}
              name="typeInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Entrada</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""} // Lida com possível null/undefined
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de entrada" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinicFinancialTypesInput.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {watchedOperation === "output" && (
            <FormField
              control={form.control}
              name="typeOutput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Saída</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""} // Lida com possível null/undefined
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de saída" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinicFinancialTypesOutput.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Select de Funcionário/Médico (Condicional) */}
          {watchedOperation === "output" &&
            watchedTypeOutput === "Pagamento Funcionário" && (
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funcionário / Médico</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""} // Lida com possível null/undefined
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o funcionário/médico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employeesAndDoctors.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

          {/* Select de Paciente (Condicional) */}
          {watchedOperation === "input" &&
            (watchedTypeInput === "Recebimento Consulta" ||
              watchedTypeInput === "Recebimento Procedimento" ||
              watchedTypeInput === "Recebimento Pacote" ||
              watchedTypeInput === "Crédito/Adiantamento Paciente") && (
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paciente</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""} // Lida com possível null/undefined
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o paciente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients.map((pat) => (
                          <SelectItem key={pat.id} value={pat.id}>
                            {pat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

          {/* Seleção de Cobranças do Paciente (Condicional) */}
          {watchedOperation === "input" &&
            (watchedTypeInput === "Recebimento Consulta" ||
              watchedTypeInput === "Recebimento Procedimento" ||
              watchedTypeInput === "Recebimento Pacote") &&
            watchedPatientId && (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Cobranças Pendentes/Vencidas do Paciente
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger type="button">
                        <Info className="size-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Selecione as cobranças que este recebimento irá
                          quitar. O valor total será calculado automaticamente.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
                <ScrollArea className="h-32 w-full rounded-md border p-2">
                  {isLoadingPatientCharges && (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                  {!isLoadingPatientCharges &&
                    patientChargesData &&
                    patientChargesData.length === 0 && (
                      <p className="text-muted-foreground text-center text-sm">
                        Nenhuma cobrança pendente/vencida encontrada.
                      </p>
                    )}
                  {!isLoadingPatientCharges &&
                    patientChargesData &&
                    patientChargesData.length > 0 && (
                      <div className="space-y-2">
                        {patientChargesData.map((charge: any) => (
                          <div
                            key={charge.id}
                            className="hover:bg-muted/50 flex items-center justify-between rounded-sm p-1"
                          >
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`charge-${charge.id}`}
                                checked={selectedPatientCharges.includes(
                                  charge.id,
                                )}
                                onCheckedChange={() =>
                                  handleChargeSelection(charge.id)
                                }
                              />
                              <Label
                                htmlFor={`charge-${charge.id}`}
                                className="cursor-pointer text-sm font-normal"
                              >
                                {charge.description || "Cobrança sem descrição"}{" "}
                                - {formatCurrencyInCents(charge.amountInCents)}
                                {charge.dueDate &&
                                  ` (Venc: ${format(new Date(charge.dueDate), "dd/MM/yy")})`}
                                <span
                                  className={cn(
                                    "ml-2 text-xs font-semibold",
                                    charge.status === "overdue"
                                      ? "text-destructive"
                                      : "text-amber-600",
                                  )}
                                >
                                  (
                                  {charge.status === "overdue"
                                    ? "Vencida"
                                    : "Pendente"}
                                  )
                                </span>
                              </Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </ScrollArea>
                <FormField
                  control={form.control}
                  name="linkedPatientChargeIds"
                  render={() => <FormMessage />}
                />
              </FormItem>
            )}

          {/* Descrição */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Detalhes da transação..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Valor */}
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
                    value={field.value === undefined ? "" : field.value}
                    onValueChange={(values) => {
                      field.onChange(
                        values.floatValue === undefined
                          ? undefined
                          : values.floatValue,
                      );
                    }}
                    disabled={
                      watchedOperation === "input" &&
                      (watchedTypeInput === "Recebimento Consulta" ||
                        watchedTypeInput === "Recebimento Procedimento" ||
                        watchedTypeInput === "Recebimento Pacote") &&
                      selectedPatientCharges.length > 0
                    }
                  />
                </FormControl>
                {watchedOperation === "input" &&
                  (watchedTypeInput === "Recebimento Consulta" ||
                    watchedTypeInput === "Recebimento Procedimento" ||
                    watchedTypeInput === "Recebimento Pacote") &&
                  selectedPatientCharges.length > 0 && (
                    <FormDescription>
                      O valor é calculado com base nas cobranças selecionadas.
                    </FormDescription>
                  )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Data Pagamento/Recebimento */}
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data Pagamento/Recebimento</FormLabel>
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
                            <span>Selecione a data</span>
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

            {/* Data Vencimento */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Vencimento (Opcional)</FormLabel>
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
                            <span>Selecione a data</span>
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
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    // Garante que o valor passado para Select seja sempre uma string válida do enum
                    value={field.value ?? "pending"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableStatuses.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                      {entry?.status &&
                        (entry.status === "overdue" ||
                          entry.status === "refunded") &&
                        entry.status === field.value && (
                          <SelectItem value={entry.status} disabled>
                            {entry.status === "overdue"
                              ? "Vencido"
                              : "Estornado"}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Forma de Pagamento */}
            {watchedStatus === "paid" && (
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de Pagamento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""} // Lida com null/undefined
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a forma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinicPaymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Observações */}
          <FormField
            control={form.control}
            name="observations"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações (Opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Informações adicionais..."
                    {...field}
                    value={field.value ?? ""} // Garante string vazia
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
