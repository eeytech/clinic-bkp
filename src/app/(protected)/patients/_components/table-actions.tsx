// src/app/(protected)/patients/_components/table-actions.tsx
"use client";

import {
  Check, // Icon for Activate
  ClipboardList,
  DollarSign,
  EditIcon,
  MoreVerticalIcon,
  Slash, // Icon for Inactivate
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { deletePatient } from "@/actions/delete-patient";
// Importar a nova action
import { togglePatientStatus } from "@/actions/patients/toggle-patient-status";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { patientsTable } from "@/db/schema";
import { cn } from "@/lib/utils"; // <-- *** ADDED IMPORT HERE ***

interface PatientsTableActionsProps {
  patient: typeof patientsTable.$inferSelect;
}

const PatientsTableActions = ({ patient }: PatientsTableActionsProps) => {
  // Estado para diálogo de edição removido
  // const [upsertDialogIsOpen, setUpsertDialogIsOpen] = useState(false);

  const deletePatientAction = useAction(deletePatient, {
    onSuccess: () => {
      toast.success("Paciente deletado com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao deletar paciente.");
    },
  });

  // Ação para ativar/inativar
  const toggleStatusAction = useAction(togglePatientStatus, {
    onSuccess: ({ data }) => {
      toast.success(
        `Paciente ${data?.newStatus === "active" ? "ativado" : "inativado"} com sucesso.`,
      );
      // Forçar refresh da página para pegar o novo status (ou usar invalidação de query)
      window.location.reload();
    },
    onError: () => {
      toast.error("Erro ao alterar status do paciente.");
    },
  });

  const handleDeletePatientClick = () => {
    if (!patient) return;
    deletePatientAction.execute({ id: patient.id });
  };

  const handleToggleStatusClick = () => {
    if (!patient) return;
    toggleStatusAction.execute({
      id: patient.id,
      currentStatus: patient.cadastralStatus, // Passa o status atual
    });
  };

  const isActive = patient.cadastralStatus === "active";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>{patient.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Link direto para a página de detalhes (que agora contém o form de edição) */}
          <DropdownMenuItem asChild>
            <Link href={`/patients/${patient.id}`} className="gap-2">
              <EditIcon className="h-4 w-4" />
              Ver Ficha / Editar
            </Link>
          </DropdownMenuItem>

          {/* Ação Ativar/Inativar */}
          <DropdownMenuItem
            onClick={handleToggleStatusClick}
            disabled={toggleStatusAction.isExecuting}
            className={cn(
              // cn function is now recognized
              "gap-2",
              !isActive
                ? "text-primary focus:text-primary"
                : "text-destructive focus:text-destructive",
            )}
          >
            {isActive ? (
              <Slash className="h-4 w-4" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {toggleStatusAction.isExecuting
              ? isActive
                ? "Inativando..."
                : "Ativando..."
              : isActive
                ? "Inativar"
                : "Ativar"}
          </DropdownMenuItem>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                variant="destructive"
                className="gap-2"
              >
                <TrashIcon className="h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Tem certeza que deseja deletar esse paciente?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser revertida. Isso irá deletar o paciente
                  e todos os seus dados associados permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeletePatientClick}
                  disabled={deletePatientAction.isExecuting}
                  className="bg-destructive hover:bg-destructive/90" // Add destructive style
                >
                  {deletePatientAction.isExecuting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default PatientsTableActions;
