// src/app/(protected)/doctors/_components/doctor-card.tsx
"use client";

import {
  CalendarIcon,
  ClockIcon,
  HandCoins, // Ícone adicionado
  Mail,
  Phone,
  TrashIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";

import { deleteDoctor } from "@/actions/delete-doctor";
// Importar o novo dialog
import PaymentHistoryDialog from "@/components/shared/payment-history-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { doctorsTable } from "@/db/schema";

import { DentalSpecialty } from "../_constants";
import { getAvailabilityInfo } from "../_helpers/availability"; // Importa a função atualizada
import UpsertDoctorForm from "./upsert-doctor-form";

// Interface atualizada para usar availableWeekDays como number[]
export interface Doctor
  extends Omit<
    typeof doctorsTable.$inferSelect,
    "specialties" | "dateOfBirth" | "availableWeekDays"
  > {
  specialties: DentalSpecialty[];
  dateOfBirth: Date;
  availableWeekDays: number[]; // Alterado para array de números
}

interface DoctorCardProps {
  doctor: Doctor;
}

const DoctorCard = ({ doctor }: DoctorCardProps) => {
  const [isUpsertDoctorDialogOpen, setIsUpsertDoctorDialogOpen] =
    useState(false);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const deleteDoctorAction = useAction(deleteDoctor, {
    onSuccess: () => {
      toast.success("Médico deletado com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao deletar médico.");
    },
  });
  const handleDeleteDoctorClick = () => {
    if (!doctor) return;
    deleteDoctorAction.execute({ id: doctor.id });
  };

  const doctorInitials = doctor.name
    .split(" ")
    .map((name) => name[0])
    .join("");

  // Usa a função atualizada
  const availability = getAvailabilityInfo(doctor);
  const specialtiesText = doctor.specialties.join(", ");

  // Formata os dias disponíveis (ex: Segunda, Quarta, Sexta)
  const availableDaysText = availability.availableDays.join(", ");

  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(
        6,
      )}`;
    }
    return phone;
  };

  const formatWhatsAppNumber = (whatsApp: string | null | undefined) => {
    if (!whatsApp) return "";
    const cleaned = whatsApp.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(
        7,
      )}`;
    }
    return whatsApp;
  };

  return (
    <>
      <Card>
        <CardHeader>
          {/* Header (mantém igual) */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={doctor.avatarImageUrl || ""}
                  alt={doctor.name || "Logo"}
                />
                <AvatarFallback>{doctorInitials}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-medium">{doctor.name}</h3>
                <p className="text-muted-foreground text-sm">
                  {specialtiesText}
                </p>
                <p className="text-muted-foreground text-sm">
                  CRO/CRM: {doctor.cro}
                </p>
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Mail className="size-3" />
                  {doctor.email}
                </p>
                <div className="text-muted-foreground flex items-center gap-1 text-sm">
                  {doctor.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="size-3" />
                      {formatPhoneNumber(doctor.phone)}
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-1 text-sm">
                  {doctor.whatsApp && (
                    <span className="flex items-center gap-1">
                      <FaWhatsapp className="size-3" />
                      {formatWhatsAppNumber(doctor.whatsApp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="flex flex-col gap-2">
          {/* Disponibilidade Atualizada */}
          <Badge variant="outline" className="whitespace-normal">
            {" "}
            {/* Permite quebra de linha */}
            <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
            {availableDaysText || "Nenhum dia selecionado"}
          </Badge>
          <Badge variant="outline">
            <ClockIcon className="mr-1 h-3 w-3" />
            {availability.fromTime.format("HH:mm")} às{" "}
            {availability.toTime.format("HH:mm")}
          </Badge>
        </CardContent>
        <Separator />
        {/* Footer (mantém igual, mas passa o doctor correto para o form) */}
        <CardFooter className="flex flex-col gap-2">
          {/* Botão Ver Detalhes */}
          <Dialog
            open={isUpsertDoctorDialogOpen}
            onOpenChange={setIsUpsertDoctorDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="w-full">Ver detalhes</Button>
            </DialogTrigger>
            <UpsertDoctorForm
              doctor={{
                ...doctor,
                dateOfBirth: doctor.dateOfBirth
                  ? doctor.dateOfBirth.toISOString().split("T")[0] // Garante formato YYYY-MM-DD
                  : null,
                availableFromTime: availability.fromTime.format("HH:mm:ss"),
                availableToTime: availability.toTime.format("HH:mm:ss"),
                specialties: doctor.specialties,
                availableWeekDays: doctor.availableWeekDays, // Passa o array de números
              }}
              onSuccess={() => setIsUpsertDoctorDialogOpen(false)}
              isOpen={isUpsertDoctorDialogOpen}
            />
          </Dialog>

          {/* Botão Histórico de Pagamentos */}
          <Dialog
            open={isPaymentHistoryOpen}
            onOpenChange={setIsPaymentHistoryOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <HandCoins className="mr-2 h-4 w-4" /> {/* Ícone adicionado */}
                Histórico de Pagamentos
              </Button>
            </DialogTrigger>
            {isPaymentHistoryOpen && (
              <PaymentHistoryDialog
                recipientId={doctor.id}
                recipientName={doctor.name}
              />
            )}
          </Dialog>

          {/* Botão Deletar Médico */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <TrashIcon />
                Deletar médico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Tem certeza que deseja deletar esse médico?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Essa ação não pode ser revertida. Isso irá deletar o médico e
                  todas as consultas agendadas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDoctorClick}>
                  Deletar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </>
  );
};

export default DoctorCard;
