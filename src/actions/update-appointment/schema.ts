import { z } from "zod";

import { appointmentStatusEnum, dentalProcedureEnum } from "@/db/schema";

export const updateAppointmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().min(1, {
    message: "Paciente é obrigatório.",
  }),
  doctorId: z.string().min(1, {
    message: "Médico é obrigatório.",
  }),
  date: z.date({
    message: "Data é obrigatória.",
  }),
  time: z.string().min(1, {
    message: "Horário é obrigatório.",
  }),
  status: z.enum(appointmentStatusEnum.enumValues),
  procedure: z.enum(dentalProcedureEnum.enumValues),
});
