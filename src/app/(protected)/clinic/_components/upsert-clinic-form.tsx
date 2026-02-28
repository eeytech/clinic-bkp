"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, XIcon } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useAction } from "next-safe-action/hooks";
import * as React from "react";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { toast } from "sonner";

import {
  UpsertClinicSchema,
  upsertClinicSchema,
} from "@/actions/clinic/schema";
import { upsertClinic } from "@/actions/clinic/upsert-clinic";
import { clinicPaymentMethods } from "@/app/(protected)/clinic/_constants";
import { brazilianStates } from "@/app/(protected)/doctors/_constants";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export interface ClinicData {
  id: string;
  name: string;
  cnpj: string | null;
  stateBusinessRegistration: string | null;
  responsibleName: string;
  croResponsavel: string;
  paymentMethods: string[];
  logoUrl: string | null;
  observations: string | null;
  phone: string | null;
  whatsApp: string | null;
  email: string | null;
  website: string | null;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string | null;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  addressZipcode: string;
}

interface UpsertClinicFormProps {
  clinicData: ClinicData | null;
  onSuccess?: () => void;
}

const nullableString = (value: string | null | undefined) =>
  value === "" ? null : value;

const UpsertClinicForm = ({ clinicData, onSuccess }: UpsertClinicFormProps) => {
  const isEditing = !!clinicData;

  const defaultValues: UpsertClinicSchema = {
    id: clinicData?.id,
    name: clinicData?.name ?? "",
    cnpj: clinicData?.cnpj ?? "",
    stateBusinessRegistration: clinicData?.stateBusinessRegistration ?? "",
    responsibleName: clinicData?.responsibleName ?? "",
    croResponsavel: clinicData?.croResponsavel ?? "",
    paymentMethods: (clinicData?.paymentMethods as any) ?? [],
    logoUrl: clinicData?.logoUrl ?? "",
    observations: clinicData?.observations ?? "",
    phone: clinicData?.phone ?? "",
    whatsApp: clinicData?.whatsApp ?? "",
    email: clinicData?.email ?? "",
    website: clinicData?.website ?? "",
    addressStreet: clinicData?.addressStreet ?? "",
    addressNumber: clinicData?.addressNumber ?? "",
    addressComplement: clinicData?.addressComplement ?? "",
    addressNeighborhood: clinicData?.addressNeighborhood ?? "",
    addressCity: clinicData?.addressCity ?? "",
    addressState: (clinicData?.addressState as any) ?? undefined,
    addressZipcode: clinicData?.addressZipcode ?? "",
  };

  const form = useForm<UpsertClinicSchema>({
    resolver: zodResolver(upsertClinicSchema),
    defaultValues: defaultValues as any,
  });

  const upsertClinicAction = useAction(upsertClinic, {
    onSuccess: () => {
      toast.success(
        isEditing
          ? "Dados da clínica atualizados!"
          : "Clínica criada com sucesso!",
      );
      onSuccess?.();
    },
    onError: (error) => {
      if (isRedirectError(error)) return;
      console.error(error);
      toast.error(
        isEditing
          ? "Erro ao atualizar dados da clínica."
          : "Erro ao criar clínica.",
      );
    },
  });

  const onSubmit = (values: UpsertClinicSchema) => {
    const transformedValues: UpsertClinicSchema = {
      ...values,
      cnpj: nullableString(values.cnpj),
      stateBusinessRegistration: nullableString(
        values.stateBusinessRegistration,
      ),
      logoUrl: nullableString(values.logoUrl),
      observations: nullableString(values.observations),
      phone: nullableString(values.phone),
      whatsApp: nullableString(values.whatsApp),
      email: nullableString(values.email),
      website: nullableString(values.website),
      addressComplement: nullableString(values.addressComplement),
    };

    upsertClinicAction.execute(transformedValues);
  };

  const selectedPaymentMethods = form.watch("paymentMethods") ?? [];

  const handlePaymentMethodChange = (value: string) => {
    const paymentMethods = form.getValues("paymentMethods") || [];
    const paymentMethodValue =
      value as (typeof clinicPaymentMethods)[number]["value"];

    if (paymentMethods.includes(paymentMethodValue)) {
      form.setValue(
        "paymentMethods",
        paymentMethods.filter((m) => m !== paymentMethodValue),
        { shouldValidate: true },
      );
    } else {
      form.setValue(
        "paymentMethods",
        [...paymentMethods, paymentMethodValue] as any,
        {
          shouldValidate: true,
        },
      );
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-h-[70vh] space-y-6 overflow-y-auto px-1 pr-4"
      >
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            Dados Gerais
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Nome da Clínica</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <PatternFormat
                      format="##.###.###/####-##"
                      mask="_"
                      placeholder="00.000.000/0000-00"
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
          <FormField
            control={form.control}
            name="stateBusinessRegistration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inscrição Estadual</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Responsável Técnico</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="responsibleName"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Nome do Responsável</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="croResponsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CRO do Responsável</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 12345/SP"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informações Administrativas</h3>
          <FormField
            control={form.control}
            name="paymentMethods"
            render={() => (
              <FormItem>
                <FormLabel>
                  Selecione os métodos de pagamento oferecidos
                </FormLabel>
                <Select
                  onValueChange={handlePaymentMethodChange}
                  value={
                    selectedPaymentMethods.length > 0
                      ? selectedPaymentMethods[0]
                      : ""
                  }
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione os métodos de pagamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Métodos de Pagamento</SelectLabel>
                      {clinicPaymentMethods.map((paymentMethod) => (
                        <SelectItem
                          key={paymentMethod.value}
                          value={paymentMethod.value}
                          data-state={
                            selectedPaymentMethods.includes(paymentMethod.value)
                              ? "checked"
                              : "unchecked"
                          }
                          onSelect={(e) => e.preventDefault()}
                        >
                          {paymentMethod.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {selectedPaymentMethods.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedPaymentMethods.map((paymentMethod) => (
                      <Button
                        key={paymentMethod}
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => handlePaymentMethodChange(paymentMethod)}
                        className="h-7"
                      >
                        {paymentMethod}
                        <XIcon className="ml-1 size-3" />
                      </Button>
                    ))}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL do Logo</FormLabel>
                <FormControl>
                  <Input
                    placeholder="URL do logo da clínica"
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
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Observações sobre a clínica."
                    {...field}
                    value={field.value ?? ""}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Contato e Endereço</h3>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contato@clinica.com"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Website (URL)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://www.suaclinica.com.br"
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
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" disabled={upsertClinicAction.isPending}>
            {upsertClinicAction.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Salvando..." : "Criando..."}
              </>
            ) : isEditing ? (
              "Salvar Alterações"
            ) : (
              "Criar Clínica"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default UpsertClinicForm;
