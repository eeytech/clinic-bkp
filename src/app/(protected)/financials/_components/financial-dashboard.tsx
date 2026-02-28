// src/app/(protected)/financials/_components/financial-dashboard.tsx
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign, // Kept for consistency, but not used in this file directly
  Loader2, // Import Loader2 for button loading state
  Printer,
  RefreshCw, // Kept for consistency, but not used in this file directly
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react"; // Added icons
import { useAction } from "next-safe-action/hooks";
import React from "react";
import { toast } from "sonner";

import {
  getClinicFinanceSummary,
  getClinicTransactions,
  markOverdueTransactions, // Import new action
} from "@/actions/clinic-finances";
import { Button } from "@/components/ui/button"; // Import Button
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

import AddFinanceEntryButton from "./add-finance-entry-button";
import FinanceCard from "./finance-card";
import FinancialsTable from "./financials-table";

// Type for filter params passed from the page
interface FilterParams {
  from?: string;
  to?: string;
  status?: string;
  operation?: string;
}

// Props for the dashboard
interface FinancialDashboardProps {
  clinicId: string;
  filterParams: FilterParams;
  // Data for selects in the Add/Edit form
  patients: { id: string; name: string }[];
  employeesAndDoctors: { id: string; name: string }[];
}

export default function FinancialDashboard({
  clinicId,
  filterParams,
  patients,
  employeesAndDoctors,
}: FinancialDashboardProps) {
  const queryClient = useQueryClient();

  // Query for Summary (Cards) - dependent on date filters
  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: [
      "clinic-finance-summary",
      clinicId,
      filterParams.from,
      filterParams.to,
    ],
    queryFn: () =>
      getClinicFinanceSummary({ from: filterParams.from, to: filterParams.to }),
  });

  // Query for Transactions (Table) - dependent on all filters
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["clinic-transactions", clinicId, filterParams],
    queryFn: () =>
      getClinicTransactions({
        from: filterParams.from,
        to: filterParams.to,
        status: filterParams.status as any, // Cast if necessary based on enum type
        operation: filterParams.operation as any,
      }),
  });

  // Action for marking overdue transactions
  const { execute: executeMarkOverdue, isExecuting: isMarkingOverdue } =
    useAction(markOverdueTransactions, {
      onSuccess: (data) => {
        toast.success(
          `${data?.data?.clinicUpdated ?? 0} lançamentos da clínica e ${data?.data?.patientsUpdated ?? 0} cobranças de pacientes marcados como vencidos.`,
        );
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({
          queryKey: ["clinic-transactions", clinicId, filterParams],
        });
        queryClient.invalidateQueries({
          queryKey: [
            "clinic-finance-summary",
            clinicId,
            filterParams.from,
            filterParams.to,
          ],
        });
        // Consider invalidating patient finances if needed, though updatePatientFinancialStatus should handle it
      },
      onError: (error) => {
        // CORREÇÃO: Acessar error.error.serverError
        toast.error(
          error.error.serverError || "Erro ao marcar transações como vencidas.",
        );
      },
    });

  // Handlers for report generation (opens new tab)
  const handlePrintReport = (type: "spent" | "received" | "pending") => {
    const urlParams = new URLSearchParams();
    if (filterParams.from) urlParams.set("from", filterParams.from);
    if (filterParams.to) urlParams.set("to", filterParams.to);
    if (filterParams.status) urlParams.set("status", filterParams.status);
    // Add operation filter only for spent/received reports
    if (type === "spent") urlParams.set("operation", "output");
    if (type === "received") urlParams.set("operation", "input");
    // Pending report inherently filters status=overdue on patient charges
    if (
      type === "pending" &&
      filterParams.status &&
      filterParams.status !== "overdue"
    ) {
      toast.info(
        "O relatório de pendências considera apenas cobranças vencidas, ignorando o filtro de status selecionado.",
      );
      urlParams.delete("status"); // Remove status filter for pending report if not overdue
    }

    window.open(
      `/api/financials/report/${type}?${urlParams.toString()}`,
      "_blank",
    );
  };

  return (
    <div className="space-y-6">
      {/* Cards Section */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingSummary ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : (
          <>
            <FinanceCard
              title="Total Gasto (Período)"
              amountInCents={summary?.data?.totalSpent ?? 0}
              icon={TrendingDown}
              variant="destructive"
              onPrint={() => handlePrintReport("spent")} // Add print handler
            />
            <FinanceCard
              title="Total Recebido (Período)"
              amountInCents={summary?.data?.totalReceived ?? 0}
              icon={TrendingUp}
              variant="success"
              onPrint={() => handlePrintReport("received")} // Add print handler
            />
            <FinanceCard
              title="A Receber (Vencido)"
              amountInCents={summary?.data?.pendingRevenue ?? 0}
              icon={DollarSign}
              variant="warning"
              onPrint={() => handlePrintReport("pending")} // Add print handler
            />
            <FinanceCard
              title="Saldo Atual (Período)"
              amountInCents={summary?.data?.currentBalance ?? 0}
              icon={Wallet}
              variant={
                (summary?.data?.currentBalance ?? 0) >= 0
                  ? "success"
                  : "destructive"
              }
              // No print for balance card
            />
          </>
        )}
      </div>

      {/* Actions and Table Section */}
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-semibold">Transações Registradas</h2>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <Button
            variant="outline"
            onClick={() => executeMarkOverdue()}
            disabled={isMarkingOverdue}
          >
            {isMarkingOverdue ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Marcar Vencidos
          </Button>
          {/* Passa as props para AddFinanceEntryButton */}
          <AddFinanceEntryButton
            patients={patients}
            employeesAndDoctors={employeesAndDoctors}
          />
        </div>
      </div>

      {isLoadingTransactions ? (
        <Skeleton className="h-64 w-full" /> // Skeleton for table
      ) : (
        <FinancialsTable
          data={transactions?.data ?? []}
          patients={patients} // Passa patients para a tabela
          employeesAndDoctors={employeesAndDoctors} // Passa employeesAndDoctors para a tabela
        />
      )}
    </div>
  );
}
