"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  DollarSign,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  Repeat,
  Settings,
  Stethoscope,
  Users,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { getClinic } from "@/actions/clinic/get-clinic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

import UpsertClinicForm, {
  ClinicData,
} from "../clinic/_components/upsert-clinic-form";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agendamentos", url: "/appointments", icon: CalendarDays },
  { title: "Medicos", url: "/doctors", icon: Stethoscope },
  { title: "Pacientes", url: "/patients", icon: UsersRound },
  { title: "Funcionarios", url: "/employees", icon: Users },
  { title: "Financeiro", url: "/financials", icon: DollarSign },
];

const otherItems = [
  { title: "Abertura de Chamados", url: "/support-tickets", icon: LifeBuoy },
];

export function AppSidebar() {
  const pathname = usePathname();
  const session = authClient.useSession();

  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [clinicData, setClinicData] = React.useState<ClinicData | null>(null);
  const [isLoadingClinic, setIsLoadingClinic] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      toast.success("Saindo do sistema...");
    } catch {
      toast.error("Erro ao sair.");
    }
  };

  const handleOpenEditDialog = async (open: boolean) => {
    setIsEditDialogOpen(open);

    if (open && !clinicData) {
      setIsLoadingClinic(true);

      try {
        const result = await getClinic();
        if (result && "data" in result && result.data) {
          setClinicData(result.data as ClinicData);
        } else {
          toast.error("Erro ao carregar dados da clinica.");
          setIsEditDialogOpen(false);
        }
      } catch {
        toast.error("Erro ao carregar dados da clinica.");
        setIsEditDialogOpen(false);
      } finally {
        setIsLoadingClinic(false);
      }
    }
  };

  const userDisplayEmail = session.data?.user?.email || "Usuario logado";
  const clinicDisplayName = clinicData?.name || "Minha clinica";

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Image
          src="/logofundotransparente.png"
          alt="Doutor Agenda"
          width={613}
          height={125}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Outros</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Dialog open={isEditDialogOpen} onOpenChange={handleOpenEditDialog}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="w-full">
                <Avatar>
                  <AvatarImage src={clinicData?.logoUrl || ""} alt={clinicDisplayName} />
                  <AvatarFallback>{clinicDisplayName[0] ?? "C"}</AvatarFallback>
                </Avatar>
                <div className="overflow-hidden text-left">
                  <p className="truncate text-sm font-medium">{clinicDisplayName}</p>
                  <p className="text-muted-foreground truncate text-xs">{userDisplayEmail}</p>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="top" className="w-56">
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                  <Settings className="mr-2 size-4" />
                  Editar Clinica
                </DropdownMenuItem>
              </DialogTrigger>

              <DropdownMenuItem asChild>
                <Link href="/clinic/select">
                  <Repeat className="mr-2 size-4" />
                  Alterar Clinica
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>
                {clinicData?.name ? `Editar ${clinicData.name}` : "Configuracoes da Clinica"}
              </DialogTitle>
              <DialogDescription>
                Atualize as informacoes da sua clinica no sistema.
              </DialogDescription>
            </DialogHeader>

            {isLoadingClinic ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : clinicData ? (
              <UpsertClinicForm
                clinicData={clinicData}
                onSuccess={() => setIsEditDialogOpen(false)}
              />
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Inicie o preenchimento dos dados da sua clinica.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}
