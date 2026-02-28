// src/app/(protected)/financials/_components/table-columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Importa o helper para cabeçalhos ordenáveis
import { DataTableColumnHeader } from "@/components/ui/data-table";
import {
  clinicFinancesTable,
  employeesTable, // Mantém employeesTable
  patientsTable,
  usersTable,
} from "@/db/schema";
import { formatCurrencyInCents } from "@/helpers/currency";
import { cn } from "@/lib/utils";

// Importa os tipos e constantes do caminho corrigido
import {
  clinicFinancialOperations,
  ClinicFinancialStatus, // Mantido para referência se necessário
  clinicFinancialStatuses,
} from "../index"; // <-- Caminho corrigido
import FinancialsTableActions from "./table-actions";

// Tipo expandido para incluir relações (sem alterações aqui)
type Transaction = typeof clinicFinancesTable.$inferSelect & {
  patient: Pick<typeof patientsTable.$inferSelect, "id" | "name"> | null;
  employee: Pick<typeof employeesTable.$inferSelect, "id" | "name"> | null; // Continua sendo employee
  creator: Pick<typeof usersTable.$inferSelect, "id" | "name"> | null;
};

// Helpers (sem alterações aqui)
const getStatusLabel = (
  statusValue:
    | (typeof clinicFinancialStatuses)[number]["value"]
    | null
    | undefined,
) => {
  return (
    clinicFinancialStatuses.find((s) => s.value === statusValue)?.label ??
    statusValue ??
    "-"
  );
};

const getOperationLabel = (
  opValue:
    | (typeof clinicFinancialOperations)[number]["value"]
    | null
    | undefined,
) => {
  return (
    clinicFinancialOperations.find((op) => op.value === opValue)?.label ??
    opValue ??
    "-"
  );
};

// Definição das colunas com cabeçalhos ordenáveis
export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "operation",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Operação" />
    ),
    cell: ({ row }) => getOperationLabel(row.original.operation),
    enableSorting: true,
  },
  {
    accessorKey: "type",
    header: "Tipo", // Não ordenável por padrão (combina dois campos)
    cell: ({ row }) => row.original.typeInput || row.original.typeOutput || "-",
    enableSorting: false,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição" />
    ),
    cell: ({ row }) => row.original.description,
    enableSorting: true,
  },
  {
    accessorKey: "amountInCents",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valor" />
    ),
    cell: ({ row }) => {
      const amount = formatCurrencyInCents(row.original.amountInCents);
      const isOutput = row.original.operation === "output";
      return (
        <span className={cn(isOutput ? "text-destructive" : "text-green-600")}>
          {isOutput ? `- ${amount}` : `+ ${amount}`}
        </span>
      );
    },
    enableSorting: true,
    sortingFn: "basic", // Usa a ordenação básica pelo valor numérico
  },
  {
    accessorKey: "relatedEntity",
    header: "Relacionado a", // Pode ser difícil ordenar por nomes combinados
    cell: ({ row }) =>
      row.original.patient?.name || row.original.employee?.name || "-",
    enableSorting: false, // Desabilitado por padrão
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      let colorClass = "";
      switch (status) {
        case "paid":
          colorClass = "text-green-600";
          break;
        case "pending":
          colorClass = "text-amber-600";
          break;
        case "overdue":
          colorClass = "text-destructive";
          break;
        case "refunded":
          colorClass = "text-gray-500 line-through";
          break;
      }
      return (
        <span className={cn("font-semibold", colorClass)}>
          {getStatusLabel(status)}
        </span>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "paymentDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data Pag./Rec." />
    ),
    cell: ({ row }) =>
      row.original.paymentDate
        ? format(new Date(row.original.paymentDate), "dd/MM/yyyy", {
            locale: ptBR,
          })
        : "-",
    enableSorting: true,
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vencimento" />
    ),
    cell: ({ row }) =>
      row.original.dueDate
        ? format(new Date(row.original.dueDate), "dd/MM/yyyy", { locale: ptBR })
        : "-",
    enableSorting: true,
  },
  {
    accessorKey: "paymentMethod",
    header: "Forma Pag.", // Geralmente não ordenável
    cell: ({ row }) => row.original.paymentMethod || "-",
    enableSorting: false,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Criado em" />
    ),
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd/MM/yy HH:mm", {
        locale: ptBR,
      }),
    enableSorting: true,
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row, table }) => {
      const meta = table.options.meta as
        | {
            patients: { id: string; name: string }[];
            employeesAndDoctors: { id: string; name: string }[];
          }
        | undefined;
      return (
        <FinancialsTableActions
          transaction={row.original}
          patients={meta?.patients ?? []}
          employeesAndDoctors={meta?.employeesAndDoctors ?? []}
        />
      );
    },
    enableSorting: false,
  },
];

export type FinancialTransaction = Transaction; // Mantém a exportação do tipo
