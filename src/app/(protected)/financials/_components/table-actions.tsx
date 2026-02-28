// src/app/(protected)/financials/_components/table-actions.tsx
"use client";

import {
  MoreHorizontal,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react"; // Ícones adicionados
import { useAction } from "next-safe-action/hooks";
import * as React from "react";
import { toast } from "sonner";

import {
  deleteClinicFinance,
  refundClinicFinance,
} from "@/actions/clinic-finances"; // Importar refund
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator, // Adicionado
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  clinicFinancesTable,
  employeesTable,
  patientsTable,
  usersTable,
} from "@/db/schema"; // Importar tabelas relacionadas

import UpsertFinanceForm from "./upsert-finance-form"; // Manter para edição

// Tipo expandido para incluir relações
type Transaction = typeof clinicFinancesTable.$inferSelect & {
  patient: Pick<typeof patientsTable.$inferSelect, "id" | "name"> | null;
  employee: Pick<typeof employeesTable.$inferSelect, "id" | "name"> | null; // Inclui funcionário/médico
  creator: Pick<typeof usersTable.$inferSelect, "id" | "name"> | null;
};

interface FinancialsTableActionsProps {
  transaction: Transaction;
  // Passar listas para o formulário de edição
  patients: { id: string; name: string }[];
  employeesAndDoctors: { id: string; name: string }[];
}

export default function FinancialsTableActions({
  transaction,
  patients = [],
  employeesAndDoctors = [],
}: FinancialsTableActionsProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);

  // Ação de Deletar
  const { execute: executeDelete, isExecuting: isDeleting } = useAction(
    deleteClinicFinance,
    {
      onSuccess: () => {
        toast.success("Lançamento deletado com sucesso.");
      },
      onError: (error) => {
        toast.error(error.error.serverError || "Erro ao deletar lançamento.");
      },
    },
  );

  // Ação de Estornar
  const { execute: executeRefund, isExecuting: isRefunding } = useAction(
    refundClinicFinance,
    {
      onSuccess: () => {
        toast.success("Lançamento estornado com sucesso.");
      },
      onError: (error) => {
        toast.error(error.error.serverError || "Erro ao estornar lançamento.");
      },
    },
  );

  const handleGenerateReceipt = () => {
    // Abrir URL da API para gerar o recibo em PDF
    window.open(`/api/financials/receipt/${transaction.id}`, "_blank");
  };

  const isPaid = transaction.status === "paid";
  const isRefunded = transaction.status === "refunded";
  const canDelete = !isPaid && !isRefunded; // Só pode deletar se não pago e não estornado
  const canRefund = isPaid; // Só pode estornar se pago
  const canEdit = !isRefunded; // Não pode editar se estornado

  return (
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Editar */}
          <DialogTrigger asChild disabled={!canEdit}>
            <DropdownMenuItem disabled={!canEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
          </DialogTrigger>

          {/* Gerar Recibo */}
          <DropdownMenuItem onClick={handleGenerateReceipt}>
            <Printer className="mr-2 h-4 w-4" />
            Gerar Recibo
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Estornar */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-orange-600 focus:bg-orange-100 focus:text-orange-600"
                onSelect={(e) => e.preventDefault()}
                disabled={!canRefund || isRefunding}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {isRefunding ? "Estornando..." : "Estornar"}
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Estorno?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação marcará o lançamento como estornado e reverterá as
                  alterações relacionadas (ex: status de cobranças do paciente).
                  Deseja continuar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => executeRefund({ id: transaction.id })}
                  disabled={isRefunding}
                >
                  {isRefunding ? "Estornando..." : "Confirmar Estorno"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Excluir */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                className="text-red-600 focus:bg-red-100 focus:text-red-600"
                onSelect={(e) => e.preventDefault()}
                disabled={!canDelete || isDeleting} // Desabilitar se não pode deletar ou se está deletando
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Excluindo..." : "Excluir"}
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser desfeita. Isso irá deletar
                  permanentemente o lançamento financeiro.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => executeDelete({ id: transaction.id })}
                  disabled={isDeleting}
                  className="bg-destructive hover:bg-destructive/90" // Estilo destrutivo
                >
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Conteúdo do Dialog para Edição */}
      <DialogContent className="sm:max-w-[600px]">
        {/* Renderiza o formulário apenas se for editar */}
        {canEdit && (
          <UpsertFinanceForm
            entry={transaction}
            onSuccess={() => setIsEditDialogOpen(false)}
            patients={patients}
            employeesAndDoctors={employeesAndDoctors}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
