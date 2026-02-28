// src/app/(protected)/patients/[id]/anamnesis/_components/anamnesis-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  ClipboardList,
  Loader2,
  Minus,
  Plus,
  Save,
} from "lucide-react";
import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";

// FIX: Importar PainCharacteristics e KnownConditions do schema
import {
  AnamnesisSchema,
  anamnesisSchema,
  KnownConditions,
  PainCharacteristics,
} from "@/actions/anamnesis/schema";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AnamnesisFormProps {
  initialData: AnamnesisSchema;
  currentRecordId: string | undefined;
  // ATUALIZADO: Inclui o ID/undefined para o Server Action decidir se é UPDATE ou INSERT
  onSaveDraft: (data: AnamnesisSchema, id: string | undefined) => Promise<void>;
  onSaveNewVersion: (data: AnamnesisSchema) => Promise<void>;
  isSaving: boolean;
  patientId: string;
}

const AnamnesisForm = ({
  initialData,
  currentRecordId,
  onSaveDraft,
  onSaveNewVersion,
  isSaving,
  patientId,
}: AnamnesisFormProps) => {
  // O Zod schema aceita Date ou String. Inicializamos com Date ou null.
  const form = useForm<AnamnesisSchema>({
    resolver: zodResolver(anamnesisSchema),
    defaultValues: initialData as any,
    mode: "onBlur",
  });

  // Resetar o formulário quando os dados iniciais mudarem
  React.useEffect(() => {
    form.reset(initialData as any);
  }, [initialData, form]);

  const {
    fields: medicationsFields,
    append: appendMedication,
    remove: removeMedication,
  } = useFieldArray({
    control: form.control,
    name: "currentMedications",
  });

  const {
    fields: allergiesFields,
    append: appendAllergy,
    remove: removeAllergy,
  } = useFieldArray({
    control: form.control,
    name: "allergies",
  });

  const onSubmit = (values: AnamnesisSchema, actionType: "draft" | "new") => {
    // 1. O schema de upsert precisa de strings para as datas.
    const formattedValues = {
      ...values,
      patientId: patientId,
      // Converte Date objects para string "yyyy-MM-dd"
      onsetDate: values.onsetDate
        ? format(values.onsetDate as Date, "yyyy-MM-dd")
        : null,
      lastDentalVisit: values.lastDentalVisit
        ? format(values.lastDentalVisit as Date, "yyyy-MM-dd")
        : null,
      consentDate: values.consentDate
        ? format(values.consentDate as Date, "yyyy-MM-dd")
        : null,
      followUpDate: values.followUpDate
        ? format(values.followUpDate as Date, "yyyy-MM-dd")
        : null,
    } as AnamnesisSchema;

    // 2. Chamar a função de salvamento apropriada
    if (actionType === "new") {
      onSaveNewVersion(formattedValues);
    } else {
      onSaveDraft(formattedValues, currentRecordId); // Passa o ID
    }
  };

  const watchSmoking = form.watch("smoking.isSmoker");
  const watchPregnancy = form.watch("pregnancy");

  // Helper para renderizar um Calendar Picker
  const renderDatePicker = (name: keyof AnamnesisSchema, label: string) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
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
                    format(field.value as Date, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione a data</span>
                  )}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value as Date}
                onSelect={(date) => field.onChange(date)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // Helper para simular uma seção colapsável (usando Card + estado local)
  // Usaremos Cards e o componente Header do Card para as seções, sem lógica de colapsar no momento.
  const FormSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => {
    return (
      <Card className="shadow-md">
        <CardHeader className="border-b p-4">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">{children}</CardContent>
      </Card>
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values, "draft"))}
        className="space-y-6 p-4"
      >
        {/* -------------------- 2. QUEIXA PRINCIPAL -------------------- */}
        <FormSection title="2. Queixa Principal">
          <FormField
            control={form.control}
            name="chiefComplaint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Queixa Principal</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Descreva a queixa principal do paciente..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="painScale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Escala de Dor (0-10)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0 a 10"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || null)
                      }
                      min={0}
                      max={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {renderDatePicker("onsetDate", "Data de Início da Queixa")}
          </div>
          <FormField
            control={form.control}
            name="painCharacteristics"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Características da Dor</FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {PainCharacteristics.map((char) => (
                      <Button
                        key={char}
                        type="button"
                        variant={
                          field.value?.includes(char) ? "default" : "outline"
                        }
                        onClick={() => {
                          const newArray = field.value?.includes(char)
                            ? field.value.filter((val) => val !== char)
                            : [...(field.value || []), char];
                          field.onChange(newArray);
                        }}
                      >
                        {char.charAt(0).toUpperCase() + char.slice(1)}
                      </Button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="previousAttemptedTreatments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tratamentos Anteriores Tentados</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Descreva tratamentos já tentados para a queixa..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* -------------------- 3. HISTÓRIA MÉDICA GERAL -------------------- */}
        <FormSection title="3. História Médica Geral">
          <FormField
            control={form.control}
            name="knownConditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Condições Médicas Conhecidas (Marque todas que se aplicam)
                </FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {KnownConditions.map((condition) => (
                      <div
                        key={condition}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={condition}
                          checked={field.value?.includes(condition)}
                          onCheckedChange={(checked) => {
                            const newArray = checked
                              ? [...(field.value || []), condition]
                              : field.value?.filter((val) => val !== condition);
                            field.onChange(newArray);
                          }}
                        />
                        <label
                          htmlFor={condition}
                          className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {condition.charAt(0).toUpperCase() +
                            condition.slice(1).replace(/_/g, " ")}
                        </label>
                      </div>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="otherMedicalConditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Outras Condições Médicas</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Outras informações relevantes não listadas..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Separator />

          {/* Medicamentos Atuais - Field Array */}
          <h4 className="pt-4 font-semibold">Medicamentos Atuais</h4>
          <div className="space-y-3">
            {medicationsFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-end gap-2 rounded-md border p-3"
              >
                <div className="grid flex-1 grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name={`currentMedications.${index}.name`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...subField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`currentMedications.${index}.dose`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Dose</FormLabel>
                        <FormControl>
                          <Input {...subField} value={subField.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`currentMedications.${index}.frequency`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Frequência</FormLabel>
                        <FormControl>
                          <Input {...subField} value={subField.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeMedication(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              appendMedication({
                name: "",
                dose: null,
                frequency: null,
                since: null,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar Medicamento
          </Button>

          <Separator />

          {/* Alergias - Field Array */}
          <h4 className="pt-4 font-semibold">Alergias</h4>
          <div className="space-y-3">
            {allergiesFields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-end gap-2 rounded-md border p-3"
              >
                <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name={`allergies.${index}.substance`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Substância</FormLabel>
                        <FormControl>
                          <Input {...subField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`allergies.${index}.reaction`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Reação</FormLabel>
                        <FormControl>
                          <Input {...subField} value={subField.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`allergies.${index}.severity`}
                    render={({ field: subField }) => (
                      <FormItem>
                        <FormLabel>Severidade</FormLabel>
                        <Select
                          onValueChange={subField.onChange}
                          value={subField.value ?? ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mild">Leve</SelectItem>
                            <SelectItem value="moderate">Moderada</SelectItem>
                            <SelectItem value="severe">Severa</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeAllergy(index)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              appendAllergy({
                substance: "",
                reaction: null,
                severity: null, // FIX: Mudado de undefined para null
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar Alergia
          </Button>

          <Separator />

          {/* Histórico Cirúrgico e Gravidez */}
          <h4 className="pt-4 font-semibold">Informações Adicionais</h4>
          <FormField
            control={form.control}
            name="surgicalHistory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Histórico Cirúrgico</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Descreva cirurgias prévias..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="pregnancy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Está Grávida?</FormLabel>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {watchPregnancy && (
              <FormField
                control={form.control}
                name="pregnancyWeeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semanas de Gestação</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Semanas"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || null)
                        }
                        min={0}
                        max={42}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </FormSection>

        {/* -------------------- 4. HÁBITOS E RISCOS -------------------- */}
        <FormSection title="4. Hábitos e Fatores de Risco">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="smoking.isSmoker"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Fumante?</FormLabel>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alcoholFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consumo de Álcool</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      <SelectItem value="ocasional">Ocasional</SelectItem>
                      <SelectItem value="weekly">Semanalmente</SelectItem>
                      <SelectItem value="daily">Diariamente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {watchSmoking && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="smoking.packPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maços/Dia</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || null)
                        }
                        min={0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smoking.years"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anos Fumando</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || null)
                        }
                        min={0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          <FormField
            control={form.control}
            name="bruxism"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Bruxismo?</FormLabel>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dietaryHabits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hábitos Alimentares</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Descreva os hábitos alimentares (ex: consumo de açúcares, refrigerantes)..."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* -------------------- 5. HISTÓRIA ODONTOLÓGICA -------------------- */}
        <FormSection title="5. História Odontológica">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {renderDatePicker("lastDentalVisit", "Data da Última Visita")}
            <FormField
              control={form.control}
              name="sensitivityToColdHot"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between self-center rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Sensibilidade a Frio/Quente?
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="previousTreatments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tratamentos Odontológicos Prévios</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="Descreva tratamentos como implantes, próteses, endodontia, etc."
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
            name="currentProsthesisOrAppliance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Próteses ou Aparelhos Atuais</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Dentadura, Aparelho Ortodôntico, Placa de Contenção"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* -------------------- 6. EXAME CLÍNICO -------------------- */}
        <FormSection title="6. Exame Clínico">
          <FormField
            control={form.control}
            name="extraOralFindings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Achados Extra-Orais</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Descreva linfonodos, assimetrias, musculatura, etc."
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
            name="intraOralFindings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Achados Intra-Orais</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Descreva lesões, úlceras, tártaro, gengivas, etc."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="cariesRisk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risco de Cárie</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o risco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Baixo</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tmjSymptoms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between self-center rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Sintomas de ATM?
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* -------------------- 8. PLANO E OBSERVAÇÕES -------------------- */}
        <FormSection title="8. Plano Inicial e Observações">
          <FormField
            control={form.control}
            name="preliminaryTreatmentPlan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plano de Tratamento Preliminar</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="Descreva o plano inicial..."
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas Gerais do Profissional</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="Observações não estruturadas sobre o paciente/atendimento."
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {renderDatePicker("followUpDate", "Data de Próximo Follow-up")}

          <Separator className="my-4" />

          <h4 className="mb-2 font-semibold">Consentimento</h4>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="consentSigned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between self-center rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Consentimento Assinado
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consentSignedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assinado por</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome do responsável pela assinatura"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {renderDatePicker("consentDate", "Data de Assinatura")}
          </div>
        </FormSection>

        {/* -------------------- FOOTER / AÇÕES -------------------- */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={isSaving || form.formState.isSubmitting}
            onClick={form.handleSubmit((values) => onSubmit(values, "draft"))}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Rascunho
          </Button>
          <Button
            type="button"
            disabled={isSaving || form.formState.isSubmitting}
            onClick={form.handleSubmit((values) => onSubmit(values, "new"))}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Salvar Novo Registro
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AnamnesisForm;
