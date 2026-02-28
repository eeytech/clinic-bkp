// src/app/(protected)/appointments/_components/upsert-appointment-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { addAppointment } from "@/actions/add-appointment";
import { getAvailableTimes } from "@/actions/get-available-times";
import { updateAppointment } from "@/actions/update-appointment";
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
import {
  appointmentStatusEnum,
  dentalProcedureEnum,
  doctorsTable,
  patientsTable,
} from "@/db/schema";
import { cn } from "@/lib/utils";

import { AppointmentWithRelations } from "./table-columns";

const baseSchema = z.object({
  patientId: z.string().min(1, {
    message: "Paciente é obrigatório.",
  }),
  doctorId: z.string().min(1, {
    message: "Médico é obrigatório.",
  }),
  date: z.date({
    required_error: "Data é obrigatória.",
  }),
  time: z.string().min(1, {
    message: "Horário é obrigatório.",
  }),
  procedure: z.enum(dentalProcedureEnum.enumValues, {
    required_error: "Procedimento é obrigatório.",
  }),
  status: z.enum(appointmentStatusEnum.enumValues),
});

const finalizeAppointmentSchema = baseSchema.pick({
  doctorId: true,
  procedure: true,
});

interface UpsertAppointmentFormProps {
  isOpen: boolean;
  patients: (typeof patientsTable.$inferSelect)[];
  doctors: (typeof doctorsTable.$inferSelect)[]; // Tipo completo do médico
  onSuccess?: () => void;
  appointment?: AppointmentWithRelations;
  type?: "edit" | "finalize";
}

const UpsertAppointmentForm = ({
  patients,
  doctors,
  onSuccess,
  isOpen,
  appointment,
  type = "edit",
}: UpsertAppointmentFormProps) => {
  const isFinalizing = type === "finalize";
  const isEditing = !!appointment;

  const form = useForm<z.infer<typeof baseSchema>>({
    resolver: zodResolver(
      isFinalizing ? finalizeAppointmentSchema : baseSchema,
    ) as any,
    defaultValues: {
      patientId: "",
      doctorId: "",
      date: undefined,
      time: "",
      procedure: undefined,
      status: "agendada",
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (appointment) {
        form.reset({
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          date: new Date(appointment.appointmentDateTime),
          time: format(new Date(appointment.appointmentDateTime), "HH:mm:ss"),
          procedure: appointment.procedure,
          status: isFinalizing ? "atendida" : "agendada",
        });
      } else {
        form.reset({
          patientId: "",
          doctorId: "",
          date: new Date(),
          time: "",
          procedure: undefined,
          status: "agendada",
        });
      }
    }
  }, [isOpen, appointment, form, isFinalizing]);

  const selectedDoctorId = form.watch("doctorId");
  const selectedDate = form.watch("date");

  const { data: availableTimes } = useQuery({
    queryKey: [
      "available-times",
      selectedDoctorId,
      selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : null,
      appointment?.id,
    ],
    queryFn: () => {
      if (!selectedDate || !selectedDoctorId) {
        return Promise.resolve({ data: [] });
      }
      return getAvailableTimes({
        date: dayjs(selectedDate).format("YYYY-MM-DD"),
        doctorId: selectedDoctorId,
        appointmentId: appointment?.id,
      });
    },
    enabled: !!selectedDate && !!selectedDoctorId,
  });

  const timeOptions = useMemo(() => {
    const times = availableTimes?.data ?? [];
    const currentTimeValue = form.getValues("time");

    if (
      isEditing &&
      currentTimeValue &&
      !times.some((t) => t.value === currentTimeValue)
    ) {
      return [
        {
          value: currentTimeValue,
          label: currentTimeValue.substring(0, 5),
          available: true,
        },
        ...times,
      ].sort((a, b) => a.value.localeCompare(b.value));
    }

    return times;
  }, [availableTimes, isEditing, form]);

  const createAppointmentAction = useAction(addAppointment, {
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso.");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.error.serverError ?? "Erro ao criar agendamento.");
    },
  });

  const updateAppointmentAction = useAction(updateAppointment, {
    onSuccess: ({ input }) => {
      if (input.status === "atendida") {
        toast.success("Agendamento finalizado com sucesso.");
      } else {
        toast.success("Agendamento atualizado com sucesso.");
      }
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(error.error.serverError ?? "Erro ao atualizar agendamento.");
    },
  });

  const onSubmit = (
    values: z.infer<typeof baseSchema | typeof finalizeAppointmentSchema>,
  ) => {
    if (appointment) {
      if (isFinalizing) {
        const finalData = {
          id: appointment.id,
          patientId: appointment.patientId,
          date: new Date(appointment.appointmentDateTime),
          time: format(new Date(appointment.appointmentDateTime), "HH:mm:ss"),
          status: "atendida" as const,
          ...(values as z.infer<typeof finalizeAppointmentSchema>),
        };
        updateAppointmentAction.execute(finalData);
      } else {
        updateAppointmentAction.execute({
          ...(values as z.infer<typeof baseSchema>),
          id: appointment.id,
        });
      }
    } else {
      createAppointmentAction.execute(values as z.infer<typeof baseSchema>);
    }
  };

  // *** CORREÇÃO APLICADA AQUI ***
  const isDateAvailable = (date: Date) => {
    if (!selectedDoctorId) return false;
    const selectedDoctor = doctors.find(
      (doctor) => doctor.id === selectedDoctorId,
    );
    if (!selectedDoctor) return false;
    const dayOfWeek = date.getDay(); // 0 (Domingo) a 6 (Sábado)

    // Verifica se o dia da semana está incluído no array availableWeekDays do médico
    return selectedDoctor.availableWeekDays.includes(dayOfWeek);
  };
  // *** FIM DA CORREÇÃO ***

  const isLoading =
    createAppointmentAction.isPending || updateAppointmentAction.isPending;

  return (
    <DialogContent className="w-full sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>
          {isEditing
            ? isFinalizing
              ? "Finalizar Agendamento"
              : "Editar Agendamento"
            : "Novo agendamento"}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Atualize as informações do agendamento."
            : "Crie um novo agendamento para sua clínica."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="patientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paciente</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isEditing}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um paciente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name}
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
            name="doctorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Médico</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um médico" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.specialties[0]}
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
            name="procedure"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Procedimento</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o procedimento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {dentalProcedureEnum.enumValues.map((procedure) => (
                      <SelectItem key={procedure} value={procedure}>
                        {procedure}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {appointmentStatusEnum.enumValues.map((status) => (
                      <SelectItem
                        key={status}
                        value={status}
                        disabled={status === "cancelada"}
                      >
                        {status.charAt(0).toUpperCase() +
                          status.slice(1).replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          disabled={isFinalizing}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={
                          (date) =>
                            date < dayjs().startOf("day").toDate() ||
                            !isDateAvailable(date) // Usa a função corrigida
                        }
                        initialFocus
                        locale={ptBR} // Adicionado locale ptBR
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
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={
                      isFinalizing || !selectedDate || !selectedDoctorId
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um horário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem
                          key={time.value}
                          value={time.value}
                          disabled={!time.available}
                        >
                          {time.label} {!time.available && "(Indisponível)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isFinalizing
                  ? "Finalizando..."
                  : "Salvando..."
                : isFinalizing
                  ? "Finalizar"
                  : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
};

export default UpsertAppointmentForm;
