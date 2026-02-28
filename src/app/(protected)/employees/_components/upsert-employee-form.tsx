// src/app/(protected)/employees/_components/upsert-employee-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc"; // Importe o plugin UTC se for usar UTC
import { CalendarIcon, Loader2 } from "lucide-react";
import { XIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { toast } from "sonner";
import { z } from "zod";

import { upsertEmployee } from "@/actions/upsert-employee"; // Importa a nova action
import {
  UpsertEmployeeSchema,
  upsertEmployeeSchema,
} from "@/actions/upsert-employee/schema"; // Importa o novo schema
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
import { Separator } from "@/components/ui/separator";
import { employeesTable } from "@/db/schema"; // Importa a nova tabela
import { cn } from "@/lib/utils";

import {
  BrazilianState,
  brazilianStates,
  EmployeeRole,
  employeeRoles,
} from "../_constants"; // Importa as novas constantes

dayjs.extend(utc); // Estenda o dayjs com o plugin UTC se necessário
// Interface para o tipo de funcionário, adaptada da interface Doctor
interface Employee
  extends Omit<
    typeof employeesTable.$inferSelect,
    "role" | "dateOfBirth" // Omit 'role' em vez de 'specialties'
  > {
  role: EmployeeRole[]; // ALTERADO: role agora é um array
  dateOfBirth: string | null;
}

interface UpsertEmployeeFormProps {
  isOpen: boolean;
  employee?: Employee; // Usa o tipo Employee
  onSuccess?: () => void;
}

const parseDate = (dateString: string | null | undefined) => {
  if (!dateString) return undefined;

  // Cria um objeto Date a partir da string de data recebida.
  const date = new Date(dateString);

  // getTimezoneOffset() retorna a diferença em minutos entre o UTC e a hora local.
  const timezoneOffset = date.getTimezoneOffset();

  // Adicionamos os minutos do offset de volta à data para corrigir o deslocamento.
  date.setMinutes(date.getMinutes() + timezoneOffset);

  return date;
};

const UpsertEmployeeForm = ({
  employee, // Usa o tipo Employee
  onSuccess,
  isOpen,
}: UpsertEmployeeFormProps) => {
  const defaultValues = {
    avatarImageUrl: employee?.avatarImageUrl ?? "",
    name: employee?.name ?? "",
    // cro: employee?.cro ?? "", // Removido
    role: (employee?.role as any) ?? [], // Usa 'role'
    rg: employee?.rg ?? "",
    cpf: employee?.cpf ?? "",
    dateOfBirth: parseDate(employee?.dateOfBirth),
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    whatsApp: employee?.whatsApp ?? "",
    // specialties: (employee?.specialties as any) ?? [], // Removido
    observations: employee?.observations ?? "",
    education: employee?.education ?? "",
    availableFromWeekDay: employee?.availableFromWeekDay?.toString() ?? "1",
    availableToWeekDay: employee?.availableToWeekDay?.toString() ?? "5",
    availableFromTime: employee?.availableFromTime ?? "",
    availableToTime: employee?.availableToTime ?? "",
    addressStreet: employee?.addressStreet ?? "",
    addressNumber: employee?.addressNumber ?? "",
    addressComplement: employee?.addressComplement ?? "",
    addressNeighborhood: employee?.addressNeighborhood ?? "",
    addressCity: employee?.addressCity ?? "",
    addressState: (employee?.addressState as any) ?? undefined,
    addressZipcode: employee?.addressZipcode ?? "",
  };

  const form = useForm<z.infer<typeof upsertEmployeeSchema>>({
    shouldUnregister: true,
    resolver: zodResolver(upsertEmployeeSchema),
    defaultValues: defaultValues as any,
  });

  useEffect(() => {
    if (isOpen) {
      form.reset(defaultValues as any);
    }
  }, [isOpen, form, employee]);

  const upsertEmployeeAction = useAction(upsertEmployee, {
    // Usa a nova action
    onSuccess: () => {
      toast.success("Funcionário salvo com sucesso.");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Erro ao salvar funcionário.");
    },
  });

  const onSubmit = (values: z.infer<typeof upsertEmployeeSchema>) => {
    const nullableString = (value: string | null | undefined) =>
      value === "" ? null : value;

    upsertEmployeeAction.execute({
      ...values,
      id: employee?.id,
      avatarImageUrl: nullableString(values.avatarImageUrl),
      phone: nullableString(values.phone),
      whatsApp: nullableString(values.whatsApp),
      observations: nullableString(values.observations),
      education: nullableString(values.education),
      addressComplement: nullableString(values.addressComplement),
    });
  };

  const selectedRoles = form.watch("role") ?? [];

  const handleRoleChange = (value: string) => {
    const roles = form.getValues("role") ?? [];
    const roleValue = value as EmployeeRole;

    if (roles.includes(roleValue)) {
      form.setValue(
        "role",
        roles.filter((r) => r !== roleValue),
        { shouldValidate: true },
      );
    } else {
      form.setValue("role", [...roles, roleValue], {
        shouldValidate: true,
      });
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          {employee ? employee.name : "Adicionar funcionário"}
        </DialogTitle>
        <DialogDescription>
          {employee
            ? "Edite as informações desse funcionário."
            : "Adicione um novo funcionário."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="max-h-[70vh] space-y-6 overflow-y-auto px-1 pr-4"
        >
          {/* Informações Pessoais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Pessoais</h3>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="exemplo@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Campo de Cargo (Modificado para Multi-Select) */}
            <FormField
              control={form.control}
              name="role"
              render={() => (
                // Removido 'field' pois usamos watch e setValue
                <FormItem>
                  <FormLabel>Cargo(s)</FormLabel>
                  <Select
                    onValueChange={handleRoleChange} // Ação ao clicar em um item
                    // O valor exibido no trigger não importa tanto aqui, pois mostraremos os selecionados abaixo
                    value={selectedRoles.length > 0 ? selectedRoles[0] : ""}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o(s) cargo(s)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employeeRoles.map((role) => (
                        <SelectItem
                          key={role.value}
                          value={role.value}
                          // Marca visualmente se está selecionado
                          data-state={
                            selectedRoles.includes(role.value as EmployeeRole)
                              ? "checked"
                              : "unchecked"
                          }
                          // Previne o fechamento do select ao clicar
                          onSelect={(e) => e.preventDefault()}
                        >
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Exibe os cargos selecionados como botões */}
                  {selectedRoles.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedRoles.map((role) => (
                        <Button
                          key={role}
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => handleRoleChange(role)}
                          className="h-7"
                        >
                          {role}
                          <XIcon className="ml-1 size-3" />
                        </Button>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Removido campo CRO/CRM */}
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
                      <PatternFormat
                        format="##.###.###-#"
                        mask="_"
                        placeholder="00.000.000-0"
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
            {/* ... (restante dos campos: Data de Nascimento, WhatsApp, Telefone) ... */}
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
                          initialFocus
                          locale={ptBR}
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsApp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <PatternFormat
                        format="(##) #####-####"
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
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <PatternFormat
                        format="(##) ####-####"
                        mask="_"
                        placeholder="(11) 9999-9999"
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

          <Separator />
          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="font-semibold">Endereço</h3>
            {/* ... (campos de endereço: Rua, Número, Bairro, Complemento, Cidade, Estado, CEP) ... */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="addressStreet"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Rua/Avenida</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="addressNeighborhood"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressComplement"
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
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="addressCity"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="addressState"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value)}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="SP" />
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
              <FormField
                control={form.control}
                name="addressZipcode"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <PatternFormat
                        format="#####-###"
                        mask="_"
                        placeholder="00000-000"
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

          <Separator />
          {/* Disponibilidade */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Disponibilidade</h3>
            {/* ... (campos de disponibilidade: Dias da semana, Horários) ... */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="availableFromWeekDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disponível de</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um dia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Domingo</SelectItem>
                        <SelectItem value="1">Segunda</SelectItem>
                        <SelectItem value="2">Terça</SelectItem>
                        <SelectItem value="3">Quarta</SelectItem>
                        <SelectItem value="4">Quinta</SelectItem>
                        <SelectItem value="5">Sexta</SelectItem>
                        <SelectItem value="6">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="availableToWeekDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Até</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um dia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Domingo</SelectItem>
                        <SelectItem value="1">Segunda</SelectItem>
                        <SelectItem value="2">Terça</SelectItem>
                        <SelectItem value="3">Quarta</SelectItem>
                        <SelectItem value="4">Quinta</SelectItem>
                        <SelectItem value="5">Sexta</SelectItem>
                        <SelectItem value="6">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="availableFromTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Das</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um horário" />
                        </SelectTrigger>
                      </FormControl>
                      {/* Adicionar opções de horário (copiar do upsert-doctor-form) */}
                      <SelectContent>
                        {/* Manhã */}
                        <SelectItem value="06:00:00">06:00</SelectItem>
                        <SelectItem value="06:30:00">06:30</SelectItem>
                        <SelectItem value="07:00:00">07:00</SelectItem>
                        <SelectItem value="07:30:00">07:30</SelectItem>
                        <SelectItem value="08:00:00">08:00</SelectItem>
                        <SelectItem value="08:30:00">08:30</SelectItem>
                        <SelectItem value="09:00:00">09:00</SelectItem>
                        <SelectItem value="09:30:00">09:30</SelectItem>
                        <SelectItem value="10:00:00">10:00</SelectItem>
                        <SelectItem value="10:30:00">10:30</SelectItem>
                        <SelectItem value="11:00:00">11:00</SelectItem>
                        <SelectItem value="11:30:00">11:30</SelectItem>
                        <SelectItem value="12:00:00">12:00</SelectItem>
                        <SelectItem value="12:30:00">12:30</SelectItem>
                        {/* Tarde */}
                        <SelectItem value="13:00:00">13:00</SelectItem>
                        <SelectItem value="13:30:00">13:30</SelectItem>
                        <SelectItem value="14:00:00">14:00</SelectItem>
                        <SelectItem value="14:30:00">14:30</SelectItem>
                        <SelectItem value="15:00:00">15:00</SelectItem>
                        <SelectItem value="15:30:00">15:30</SelectItem>
                        <SelectItem value="16:00:00">16:00</SelectItem>
                        <SelectItem value="16:30:00">16:30</SelectItem>
                        <SelectItem value="17:00:00">17:00</SelectItem>
                        <SelectItem value="17:30:00">17:30</SelectItem>
                        <SelectItem value="18:00:00">18:00</SelectItem>
                        <SelectItem value="18:30:00">18:30</SelectItem>
                        {/* Noite */}
                        <SelectItem value="19:00:00">19:00</SelectItem>
                        <SelectItem value="19:30:00">19:30</SelectItem>
                        <SelectItem value="20:00:00">20:00</SelectItem>
                        <SelectItem value="20:30:00">20:30</SelectItem>
                        <SelectItem value="21:00:00">21:00</SelectItem>
                        <SelectItem value="21:30:00">21:30</SelectItem>
                        <SelectItem value="22:00:00">22:00</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="availableToTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Até</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione um horário" />
                        </SelectTrigger>
                      </FormControl>
                      {/* Adicionar opções de horário (copiar do upsert-doctor-form) */}
                      <SelectContent>
                        {/* Manhã */}
                        <SelectItem value="06:00:00">06:00</SelectItem>
                        <SelectItem value="06:30:00">06:30</SelectItem>
                        <SelectItem value="07:00:00">07:00</SelectItem>
                        <SelectItem value="07:30:00">07:30</SelectItem>
                        <SelectItem value="08:00:00">08:00</SelectItem>
                        <SelectItem value="08:30:00">08:30</SelectItem>
                        <SelectItem value="09:00:00">09:00</SelectItem>
                        <SelectItem value="09:30:00">09:30</SelectItem>
                        <SelectItem value="10:00:00">10:00</SelectItem>
                        <SelectItem value="10:30:00">10:30</SelectItem>
                        <SelectItem value="11:00:00">11:00</SelectItem>
                        <SelectItem value="11:30:00">11:30</SelectItem>
                        <SelectItem value="12:00:00">12:00</SelectItem>
                        <SelectItem value="12:30:00">12:30</SelectItem>
                        {/* Tarde */}
                        <SelectItem value="13:00:00">13:00</SelectItem>
                        <SelectItem value="13:30:00">13:30</SelectItem>
                        <SelectItem value="14:00:00">14:00</SelectItem>
                        <SelectItem value="14:30:00">14:30</SelectItem>
                        <SelectItem value="15:00:00">15:00</SelectItem>
                        <SelectItem value="15:30:00">15:30</SelectItem>
                        <SelectItem value="16:00:00">16:00</SelectItem>
                        <SelectItem value="16:30:00">16:30</SelectItem>
                        <SelectItem value="17:00:00">17:00</SelectItem>
                        <SelectItem value="17:30:00">17:30</SelectItem>
                        <SelectItem value="18:00:00">18:00</SelectItem>
                        <SelectItem value="18:30:00">18:30</SelectItem>
                        {/* Noite */}
                        <SelectItem value="19:00:00">19:00</SelectItem>
                        <SelectItem value="19:30:00">19:30</SelectItem>
                        <SelectItem value="20:00:00">20:00</SelectItem>
                        <SelectItem value="20:30:00">20:30</SelectItem>
                        <SelectItem value="21:00:00">21:00</SelectItem>
                        <SelectItem value="21:30:00">21:30</SelectItem>
                        <SelectItem value="22:00:00">22:00</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator />
          {/* Informações Adicionais */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Adicionais</h3>
            {/* ... (campos adicionais: Educação, Observações, URL da Foto) ... */}
            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formação (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Curso Técnico em Saúde Bucal"
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
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Foto (Opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="URL da Foto do funcionário"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={upsertEmployeeAction.isPending}>
              {upsertEmployeeAction.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {employee ? "Salvando..." : "Criando..."}
                </>
              ) : employee ? (
                "Salvar Alterações"
              ) : (
                "Adicionar Funcionário"
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};

export default UpsertEmployeeForm;
