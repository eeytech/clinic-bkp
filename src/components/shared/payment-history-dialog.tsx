// src/components/shared/payment-history-dialog.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import dayjs from "dayjs";
import { CalendarIcon, Loader2, Printer } from "lucide-react";
import { parseAsIsoDate, useQueryState } from "nuqs";
import React from "react";
import { DateRange } from "react-day-picker";

import { getPaymentsByRecipient } from "@/actions/get-payments-by-recipient/get-payments-by-recipient";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DataTable } from "@/components/ui/data-table";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clinicFinancesTable } from "@/db/schema";
import { formatCurrencyInCents } from "@/helpers/currency";
import { cn } from "@/lib/utils";

type PaymentEntry = typeof clinicFinancesTable.$inferSelect;

interface PaymentHistoryDialogProps {
  recipientId: string;
  recipientName: string;
}

const columns: {
  accessorKey: keyof PaymentEntry | "displayDate"; // Adicionado displayDate
  header: string;
  cell: ({ row }: { row: { original: PaymentEntry } }) => React.ReactNode;
}[] = [
  {
    accessorKey: "id",
    header: "#",
    cell: ({ row }) => row.original.id,
  },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => row.original.description || "-",
  },
  {
    accessorKey: "displayDate", // Usar a chave combinada
    header: "Data Pag.",
    cell: ({ row }) =>
      row.original.paymentDate
        ? format(new Date(row.original.paymentDate), "dd/MM/yyyy", {
            locale: ptBR,
          })
        : "-",
  },
  {
    accessorKey: "paymentMethod",
    header: "Método",
    cell: ({ row }) => row.original.paymentMethod || "-",
  },
  {
    accessorKey: "amountInCents",
    header: "Valor",
    cell: ({ row }) => formatCurrencyInCents(row.original.amountInCents),
  },
];

export default function PaymentHistoryDialog({
  recipientId,
  recipientName,
}: PaymentHistoryDialogProps) {
  // Estado para o Date Range Picker
  const [from, setFrom] = useQueryState("from", parseAsIsoDate);
  const [to, setTo] = useQueryState("to", parseAsIsoDate);

  const dateRange = React.useMemo(
    () => ({ from: from ?? undefined, to: to ?? undefined }),
    [from, to],
  );

  const handleDateSelect = (range: DateRange | undefined) => {
    setFrom(range?.from ?? null);
    setTo(range?.to ?? null);
  };

  // Busca os pagamentos usando React Query
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["recipient-payments", recipientId, from, to],
    queryFn: async () => {
      const result = await getPaymentsByRecipient({
        recipientId,
        from: from ?? undefined,
        to: to ?? undefined,
      });
      return result?.data ?? [];
    },
    enabled: !!recipientId, // Só busca se recipientId estiver definido
  });

  // Calcula o total
  const totalAmount = React.useMemo(
    () => payments.reduce((sum, p) => sum + p.amountInCents, 0),
    [payments],
  );

  const handlePrint = () => {
    const urlParams = new URLSearchParams();
    if (from) urlParams.set("from", from.toISOString().split("T")[0]);
    if (to) urlParams.set("to", to.toISOString().split("T")[0]);
    // Adiciona o recipientId à URL da API
    window.open(
      `/api/financials/report/recipient/${recipientId}?${urlParams.toString()}`,
      "_blank",
    );
  };

  return (
    <DialogContent className="max-w-[800px]">
      <DialogHeader>
        <DialogTitle>Histórico de Pagamentos - {recipientName}</DialogTitle>
        <DialogDescription>
          Visualize os pagamentos recebidos no período selecionado.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal sm:w-[300px]",
                !dateRange?.from && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/y", { locale: ptBR })} -{" "}
                    {format(dateRange.to, "dd/MM/y", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/y")
                )
              ) : (
                <span>Selecione o período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange as DateRange}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Relatório
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="max-h-[50vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.accessorKey}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    {columns.map((column) => (
                      <TableCell key={`${payment.id}-${column.accessorKey}`}>
                        {column.cell({ row: { original: payment } })}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Nenhum pagamento encontrado no período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell
                  colSpan={columns.length - 1}
                  className="text-right font-semibold"
                >
                  Total Recebido no Período:
                </TableCell>
                <TableCell className="font-bold">
                  {formatCurrencyInCents(totalAmount)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </DialogContent>
  );
}
