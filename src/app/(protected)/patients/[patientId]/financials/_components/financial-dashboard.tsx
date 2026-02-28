"use client";

import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";

import { getPatientFinances } from "@/actions/patient-finances";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { patientFinancesTable, patientsTable } from "@/db/schema";
import { formatCurrencyInCents } from "@/helpers/currency";

import AddFinanceEntryButton from "./add-finance-entry-button";
import FinancialsTable from "./financials-table";

type FinanceEntry = typeof patientFinancesTable.$inferSelect;
type Patient = typeof patientsTable.$inferSelect;

interface FinancialDashboardProps {
  patient: Patient;
  initialFinances: FinanceEntry[];
}

export default function FinancialDashboard({
  patient,
  initialFinances,
}: FinancialDashboardProps) {
  const { data: finances = [] } = useQuery({
    queryKey: ["patient-finances", patient.id],
    queryFn: async () => {
      const result = await getPatientFinances({ patientId: patient.id });
      // CORREÇÃO: Adicionada verificação para 'result'
      return result?.data || [];
    },
    initialData: initialFinances,
  });

  const { totalCharges, totalPayments, balance } = React.useMemo(() => {
    const totals = finances.reduce(
      (acc, entry) => {
        if (entry.type === "charge") {
          acc.totalCharges += entry.amountInCents;
        } else {
          acc.totalPayments += entry.amountInCents;
        }
        return acc;
      },
      { totalCharges: 0, totalPayments: 0 },
    );
    return {
      ...totals,
      balance: totals.totalPayments - totals.totalCharges,
    };
  }, [finances]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Resumo Financeiro</h2>
          <Badge
            variant={
              patient.financialStatus === "inadimplente"
                ? "destructive"
                : "default"
            }
            className={
              patient.financialStatus === "adimplente"
                ? "bg-green-500 hover:bg-green-600"
                : ""
            }
          >
            {patient.financialStatus === "inadimplente"
              ? "Inadimplente"
              : "Adimplente"}
          </Badge>
        </div>
        <AddFinanceEntryButton patientId={patient.id} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <TrendingDown className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyInCents(totalCharges)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyInCents(totalPayments)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                balance < 0 ? "text-destructive" : "text-green-600"
              }`}
            >
              {formatCurrencyInCents(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <FinancialsTable data={finances} patientId={patient.id} />
    </div>
  );
}
