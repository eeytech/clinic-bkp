// src/app/(protected)/patients/_components/upsert-patient-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc"; // Importar utc
import { CalendarIcon, Loader2 } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useAction } from "next-safe-action/hooks";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { toast } from "sonner";
import { z } from "zod";

import { upsertPatient } from "@/actions/upsert-patient";
// Importar schema atualizado
import {
  UpsertPatientSchema,
  upsertPatientSchema,
} from "@/actions/upsert-patient/schema";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
// Importar DialogContent, etc.
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea"; // Import Textarea
import { patientsTable } from "@/db/schema";
import { cn } from "@/lib/utils";

import { BrazilianState, brazilianStates } from "../../doctors/_constants";

dayjs.extend(utc); // Extend dayjs

interface UpsertPatientFormProps {
  // isOpen e onSuccess são opcionais
  isOpen?: boolean;
  patient?: typeof patientsTable.$inferSelect;
  onSuccess?: () => void;
}

const parseDate = (
  dateString: string | Date | null | undefined,
): Date | undefined => {
  if (!dateString) return undefined;
  // Se já for Date, retorna ele mesmo
  if (dateString instanceof Date) {
    // Ajusta para UTC 00:00:00 para evitar problemas de timezone no Calendar
    const utcDate = dayjs(dateString).utc().startOf("day").toDate();
    return utcDate;
  }
  // Se for string, tenta parsear e ajustar
  const date = dayjs(dateString).utc().startOf("day").toDate(); // Parse como UTC e zera a hora
  return isNaN(date.getTime()) ? undefined : date;
};

const UpsertPatientForm = ({
  patient,
  onSuccess,
  isOpen, // Prop opcional
}: UpsertPatientFormProps) => {
  const defaultValues = {
    name: patient?.name ?? "",
    email: patient?.email ?? "", // Email agora é opcional
    phoneNumber: patient?.phoneNumber ?? "",
    sex: patient?.sex ?? undefined,
    cpf: patient?.cpf ?? "",
    rg: patient?.rg ?? "",
    dateOfBirth: parseDate(patient?.dateOfBirth),
    street: patient?.street ?? "",
    number: patient?.number ?? "",
    neighborhood: patient?.neighborhood ?? "",
    zipCode: patient?.zipCode ?? "",
    city: patient?.city ?? "",
    state: (patient?.state as keyof typeof BrazilianState) ?? undefined, // Usa undefined se não houver
    complement: patient?.complement ?? "",
    responsibleName: patient?.responsibleName ?? "",
    responsibleCpf: patient?.responsibleCpf ?? "",
    responsibleRg: patient?.responsibleRg ?? "",
    responsiblePhoneNumber: patient?.responsiblePhoneNumber ?? "",
    cadastralStatus: patient?.cadastralStatus ?? "active", // Inclui status cadastral
  };

  const form = useForm<UpsertPatientSchema>({
    shouldUnregister: true,
    resolver: zodResolver(upsertPatientSchema),
    defaultValues: defaultValues as any, // Cast necessário por causa da data
  });

  useEffect(() => {
    // Reset só se `isOpen` for true (se usado em Dialog) ou sempre (se usado direto na tab)
    if (isOpen === undefined || isOpen) {
      form.reset({
        ...defaultValues,
        dateOfBirth: parseDate(patient?.dateOfBirth), // Reparsear a data no reset
        state: (patient?.state as keyof typeof BrazilianState) ?? undefined,
        cadastralStatus: patient?.cadastralStatus ?? "active",
      } as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, form, patient]); // Dependências ajustadas

  const upsertPatientAction = useAction(upsertPatient, {
    onSuccess: () => {
      toast.success("Paciente salvo com sucesso.");
      onSuccess?.(); // Chama onSuccess se existir
    },
    onError: (error) => {
      // Evita toast de erro para redirecionamentos
      if (isRedirectError(error.error as any)) return;
      console.error("Erro ao salvar paciente:", error);
      toast.error(error.error.serverError || "Erro ao salvar paciente.");
    },
  });

  const onSubmit = (values: UpsertPatientSchema) => {
    const nullableString = (value: string | null | undefined) =>
      value === "" ? null : value;

    // Remover cadastralStatus antes de enviar, pois ele é gerenciado por outra action
    const { cadastralStatus, ...submitValues } = values;

    upsertPatientAction.execute({
      ...submitValues,
      id: patient?.id,
      email: nullableString(values.email), // Email pode ser nulo
      complement: nullableString(values.complement),
      responsibleName: nullableString(values.responsibleName),
      responsibleCpf: nullableString(values.responsibleCpf),
      responsibleRg: nullableString(values.responsibleRg),
      responsiblePhoneNumber: nullableString(values.responsiblePhoneNumber),
    });
  };

  // Definir se o componente está dentro de um Dialog para renderização condicional
  const isInDialog = isOpen !== undefined;

  // *** CORREÇÃO APLICADA AQUI ***
  // Seleciona o componente wrapper correto
  const FormWrapper = isInDialog ? DialogContent : React.Fragment;
  const formWrapperProps = isInDialog ? { className: "sm:max-w-[700px]" } : {};
  // *** FIM DA CORREÇÃO ***

  const FormContent = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "space-y-6",
          // Aplica padding e overflow apenas quando DENTRO de um Dialog
          isInDialog && "max-h-[70vh] overflow-y-auto px-1 pr-4",
          // Aplica estilo de Card quando NÃO ESTÁ em um Dialog
          !isInDialog &&
            "bg-card text-card-foreground rounded-lg border p-6 shadow-sm",
        )}
      >
        {/* Renderiza Header apenas se estiver em Dialog */}
        {isInDialog && (
          <DialogHeader>
            <DialogTitle>
              {patient ? patient.name : "Adicionar paciente"}
            </DialogTitle>
            <DialogDescription>
              {patient
                ? "Edite as informações desse paciente."
                : "Adicione um novo paciente."}
            </DialogDescription>
          </DialogHeader>
        )}

        {/* Status Cadastral (Visualização) */}
        {patient && ( // Mostra apenas na edição
          <FormField
            control={form.control}
            name="cadastralStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status Cadastral</FormLabel>
                <Select value={field.value} disabled>
                  <FormControl>
                    <SelectTrigger className="w-full cursor-not-allowed opacity-70 md:w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  O status é alterado na lista de pacientes.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Dados Gerais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dados Gerais</h3>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>E-mail (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="exemplo@email.com"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone / WhatsApp</FormLabel>
                  <FormControl>
                    <PatternFormat
                      format={
                        field.value &&
                        field.value.replace(/\D/g, "").length === 11
                          ? "(##) #####-####"
                          : "(##) ####-####"
                      }
                      mask="_"
                      placeholder="(11) 99999-9999"
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value.value);
                      }}
                      customInput={Input}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Nascimento</FormLabel>
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
                            format(field.value, "dd/MM/yyyy", {
                              locale: ptBR,
                            })
                          ) : (
                            <span>Selecione</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        captionLayout="dropdown"
                        fromYear={1930}
                        toYear={new Date().getFullYear()}
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
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Documentos */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documentos</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <PatternFormat
                      format="###.###.###-##"
                      mask="_"
                      placeholder="000.000.000-00"
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value.value);
                      }}
                      customInput={Input}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RG</FormLabel>
                  <FormControl>
                    {/* Usar Input normal para RG, pois formato varia */}
                    <Input placeholder="00.000.000-0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Endereço */}
        <div className="space-y-4">
          <h3 className="font-semibold">Endereço</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <PatternFormat
                      format="#####-###"
                      mask="_"
                      placeholder="00000-000"
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value.value);
                      }}
                      customInput={Input}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Rua/Avenida</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="complement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Complemento (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {brazilianStates.map((state) => (
                        <SelectItem key={state.value} value={state.value}>
                          {state.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />

        {/* Dados do Responsável (Opcionais) */}
        <div className="space-y-4">
          <h3 className="font-semibold">Responsável (Opcional)</h3>
          <FormField
            control={form.control}
            name="responsibleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do responsável</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="responsibleCpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF do responsável</FormLabel>
                  <FormControl>
                    <PatternFormat
                      format="###.###.###-##"
                      mask="_"
                      placeholder="000.000.000-00"
                      value={field.value ?? ""}
                      onValueChange={(value) => {
                        field.onChange(value.value);
                      }}
                      customInput={Input}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responsibleRg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RG do responsável</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00.000.000-0"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responsiblePhoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone do responsável</FormLabel>
                  <FormControl>
                    <PatternFormat
                      format={
                        field.value &&
                        field.value.replace(/\D/g, "").length === 11
                          ? "(##) #####-####"
                          : "(##) ####-####"
                      }
                      mask="_"
                      placeholder="(11) 99999-9999"
                      value={field.value ?? ""}
                      onValueChange={(value) => {
                        field.onChange(value.value);
                      }}
                      customInput={Input}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Renderiza o Footer correto dependendo do contexto */}
        {isInDialog ? (
          <DialogFooter>
            <Button
              type="submit"
              disabled={upsertPatientAction.isPending}
              className="w-full sm:w-auto"
            >
              {upsertPatientAction.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        ) : (
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={upsertPatientAction.isPending}>
              {upsertPatientAction.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );

  // Renderiza o conteúdo dentro do Wrapper apropriado
  return <FormWrapper {...formWrapperProps}>{FormContent}</FormWrapper>;
};

export default UpsertPatientForm;
