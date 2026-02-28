// src/app/(protected)/patients/[patientId]/financials/_components/financials-table.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge"; // Import Badge
// Importa DataTable e DataTableColumnHeader
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import { patientFinancesTable } from "@/db/schema";
import { formatCurrencyInCents } from "@/helpers/currency";
import { cn } from "@/lib/utils"; // Import cn

import FinancialsTableActions from "./financials-table-actions";

type FinanceEntry = typeof patientFinancesTable.$inferSelect & {
  patientId: string; // Garante que patientId está presente
};

interface FinancialsTableProps {
  data: FinanceEntry[];
  patientId: string; // Mantém patientId para passar para actions se necessário
}

// Define as colunas usando ColumnDef e DataTableColumnHeader
const columns: ColumnDef<FinanceEntry>[] = [
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tipo" />
    ),
    cell: ({ row }) =>
      row.original.type === "charge" ? "Cobrança" : "Pagamento",
    enableSorting: true,
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Descrição" />
    ),
    cell: ({ row }) => row.original.description || "-",
    enableSorting: true,
  },
  {
    accessorKey: "amountInCents",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Valor" />
    ),
    cell: ({ row }) => {
      const amount = formatCurrencyInCents(row.original.amountInCents);
      const isCharge = row.original.type === "charge";
      return (
        <span className={cn(isCharge ? "text-destructive" : "text-green-600")}>
          {isCharge ? `- ${amount}` : `+ ${amount}`}
        </span>
      );
    },
    enableSorting: true,
    sortingFn: "basic", // Ordena pelo valor numérico
  },
  {
    accessorKey: "method",
    header: "Método", // Não ordenável
    cell: ({ row }) => row.original.method || "-",
    enableSorting: false,
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Vencimento" />
    ),
    cell: ({ row }) =>
      row.original.dueDate
        ? format(new Date(row.original.dueDate), "dd/MM/yyyy", {
            locale: ptBR,
          })
        : "-",
    enableSorting: true,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      if (row.original.type === "payment") return "-"; // Pagamentos não têm status
      const status = row.original.status;
      let variant: "default" | "destructive" | "secondary" = "secondary";
      let text = "Pendente";
      if (status === "paid") {
        variant = "default"; // Usar 'default' (verde) para pago
        text = "Pago";
      } else if (status === "overdue") {
        variant = "destructive";
        text = "Vencido";
      }
      return <Badge variant={variant}>{text}</Badge>;
    },
    enableSorting: true,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Data Lanç." />
    ),
    cell: ({ row }) =>
      format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm", {
        locale: ptBR,
      }),
    enableSorting: true,
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => <FinancialsTableActions entry={row.original} />,
    enableSorting: false,
  },
];

export default function FinancialsTable({
  data,
  patientId, // patientId pode não ser mais necessário aqui se já estiver no 'entry'
}: FinancialsTableProps) {
  // Passa patientId para as actions através do objeto entry
  const columnsWithActions = columns.map((col) => {
    if (col.id === "actions") {
      return {
        ...col,
        // Garante que o patientId está no objeto 'entry' passado para as actions
        cell: ({ row }: { row: { original: FinanceEntry } }) => (
          <FinancialsTableActions
            entry={{ ...row.original, patientId: patientId }}
          />
        ),
      };
    }
    return col;
  });

  return <DataTable columns={columnsWithActions} data={data} />;
}
