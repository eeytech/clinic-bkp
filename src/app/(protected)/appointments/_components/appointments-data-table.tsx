// src/app/(protected)/appointments/_components/appointments-data-table.tsx
"use client";

import * as React from "react"; // Import React

import { DataTable } from "@/components/ui/data-table"; // DataTable já inclui paginação/ordenação
import { doctorsTable, patientsTable } from "@/db/schema";

import AppointmentsTableActions from "./table-actions";
import {
  appointmentsTableColumns, // Importa as colunas já configuradas
  AppointmentWithRelations,
} from "./table-columns";

interface AppointmentsDataTableProps {
  data: AppointmentWithRelations[];
  patients: (typeof patientsTable.$inferSelect)[];
  doctors: (typeof doctorsTable.$inferSelect)[];
}

export function AppointmentsDataTable({
  data,
  patients,
  doctors,
}: AppointmentsDataTableProps) {
  // Passa patients e doctors para as actions via meta ou ajusta a coluna de ações
  // Aqui, vamos ajustar a coluna 'actions' para renderizar com os dados corretos
  const columns = React.useMemo(() => {
    return appointmentsTableColumns.map((column) => {
      if (column.id === "actions") {
        return {
          ...column,
          cell: ({ row }: { row: { original: AppointmentWithRelations } }) => (
            <AppointmentsTableActions
              appointment={row.original}
              patients={patients} // Passa a lista completa de pacientes
              doctors={doctors} // Passa a lista completa de médicos
            />
          ),
        };
      }
      return column;
    });
  }, [patients, doctors]); // Recalcula se patients ou doctors mudarem

  return <DataTable data={data} columns={columns} />;
}
