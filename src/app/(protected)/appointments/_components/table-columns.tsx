// src/app/(protected)/appointments/_components/table-columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Importa o helper para cabeçalhos ordenáveis
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { appointmentsTable, doctorsTable, patientsTable } from "@/db/schema";

import AppointmentsTableActions from "./table-actions";

export type AppointmentWithRelations = typeof appointmentsTable.$inferSelect & {
  patient: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    sex: "male" | "female";
  };
  doctor: {
    id: string;
    name: string;
    specialty: string; // Mantido, mesmo que venha de specialties[0]
  };
};

export const appointmentsTableColumns: ColumnDef<AppointmentWithRelations>[] = [
  {
    accessorKey: "patient.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Paciente" />
    ),
    cell: ({ row }) => row.original.patient.name, // Exibe o nome diretamente
    enableSorting: true, // Habilita ordenação para esta coluna
  },
  {
    accessorKey: "doctor.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Médico" />
    ),
    cell: ({ row }) => row.original.doctor.name, // Exibe o nome diretamente
    enableSorting: true, // Habilita ordenação para esta coluna
  },
  {
    accessorKey: "appointmentDateTime",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data e Hora" />
    ),
    cell: ({ row }) => {
      const appointment = row.original;
      return format(
        new Date(appointment.appointmentDateTime),
        "dd/MM/yyyy 'às' HH:mm",
        {
          locale: ptBR,
        },
      );
    },
    enableSorting: true, // Habilita ordenação para esta coluna
  },
  {
    accessorKey: "procedure",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Procedimento" />
    ),
    cell: ({ row }) => row.original.procedure, // Exibe o procedimento diretamente
    enableSorting: true, // Habilita ordenação para esta coluna
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      // Capitaliza a primeira letra e remove underscores
      return status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
    },
    enableSorting: true, // Habilita ordenação para esta coluna
  },
  {
    id: "actions",
    header: "Ações", // Adiciona um header para a coluna de ações
    cell: ({ row }) => {
      const appointment = row.original;
      // Esta parte será sobrescrita na `appointments-data-table.tsx`
      return (
        <AppointmentsTableActions
          appointment={appointment}
          patients={[]}
          doctors={[]}
        />
      );
    },
    enableSorting: false, // Desabilita ordenação para a coluna de ações
  },
];
