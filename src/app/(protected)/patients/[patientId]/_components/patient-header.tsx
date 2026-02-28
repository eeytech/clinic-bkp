// src/app/(protected)/patients/[patientId]/_components/patient-header.tsx
"use client";

import { Check, Edit, MoreVertical, Slash, Trash2 } from "lucide-react"; // Import Check and Slash
import Link from "next/link"; // Keep Link if needed elsewhere, otherwise remove
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator, // Import Separator if needed
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PageActions,
  PageDescription,
  PageHeader,
  PageHeaderContent,
  PageTitle,
} from "@/components/ui/page-container";
import { patientsTable } from "@/db/schema";
import { cn } from "@/lib/utils"; // Import cn

// UpsertPatientForm e Dialog removidos daqui

interface PatientHeaderProps {
  patient: typeof patientsTable.$inferSelect;
}

export function PatientHeader({ patient }: PatientHeaderProps) {
  // Estado para diálogo de edição removido
  // const [upsertDialogIsOpen, setUpsertDialogIsOpen] = useState(false);

  const { execute: executeDelete, isExecuting: isDeleting } = useAction(
    deletePatient,
    {
      onSuccess: () => {
        toast.success("Paciente deletado com sucesso.");
        // Redirecionar para a lista de pacientes após deletar
        window.location.href = "/patients";
      },
      onError: () => {
        toast.error("Erro ao deletar paciente.");
      },
    },
  );

  // Ação para ativar/inativar
  const { execute: executeToggleStatus, isExecuting: isTogglingStatus } =
    useAction(togglePatientStatus, {
      onSuccess: ({ data }) => {
        toast.success(
          `Paciente ${data?.newStatus === "active" ? "ativado" : "inativado"} com sucesso.`,
        );
        // Forçar refresh da página para pegar o novo status
        window.location.reload();
      },
      onError: () => {
        toast.error("Erro ao alterar status do paciente.");
      },
    });

  const handleDeleteClick = () => {
    executeDelete({ id: patient.id });
  };

  const handleToggleStatusClick = () => {
    executeToggleStatus({
      id: patient.id,
      currentStatus: patient.cadastralStatus,
    });
  };

  const isActive = patient.cadastralStatus === "active";

  return (
    <>
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>{patient.name}</PageTitle>
          <PageDescription>
            {/* Remover ID */}
            CPF: {patient.cpf} | Status Financeiro:{" "}
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
            | Status Cadastro:{" "}
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={cn(isActive && "bg-green-500 hover:bg-green-600")}
            >
              {isActive ? "Ativo" : "Inativo"}
            </Badge>
          </PageDescription>
        </PageHeaderContent>
        <PageActions>
          {/* Remover Botão Voltar */}
          {/* <Button variant="outline" asChild>
            <Link href="/patients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button> */}
          {/* Remover Dialog de Edição */}
          {/* <Dialog open={upsertDialogIsOpen} onOpenChange={setUpsertDialogIsOpen}> */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {/* Remover item Editar */}
              {/* <DropdownMenuItem onClick={() => setUpsertDialogIsOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem> */}
              {/* Adicionar Ativar/Inativar */}
              <DropdownMenuItem
                onClick={handleToggleStatusClick}
                disabled={isTogglingStatus}
                className={cn(
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
                {isTogglingStatus
                  ? isActive
                    ? "Inativando..."
                    : "Ativando..."
                  : isActive
                    ? "Inativar"
                    : "Ativar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={(e) => e.preventDefault()}
                    className="gap-2" // Add gap
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Tem certeza que deseja deletar esse paciente?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação não pode ser revertida. Isso irá deletar o
                      paciente e todos os seus dados associados permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                      className="bg-destructive hover:bg-destructive/90" // Add destructive style
                    >
                      {isDeleting ? "Excluindo..." : "Excluir"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Remover UpsertPatientForm daqui */}
          {/* <UpsertPatientForm
              isOpen={upsertDialogIsOpen}
              patient={patient}
              onSuccess={() => setUpsertDialogIsOpen(false)}
            /> */}
          {/* </Dialog> */}
        </PageActions>
      </PageHeader>
    </>
  );
}
