import { requireModulePermission } from "@/lib/permissions/mbac";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./_components/app-sidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verifica se o utilizador tem permissão mínima para o dashboard do SaaS
  await requireModulePermission("dashboard", "READ");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
