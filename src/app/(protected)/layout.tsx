import { redirect } from "next/navigation";

import { AppSidebar } from "./_components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { requireModulePermission } from "@/lib/permissions/mbac";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission("dashboard", "READ");

  const session = await auth.api.getSession();

  if (!session) {
    redirect("/authentication");
  }

  const hasAnyLocalClinic = (session.user.clinics?.length ?? 0) > 0;
  const canBootstrapClinic =
    session.user.isApplicationAdmin && Boolean(session.user.activeClinicId);

  if (!hasAnyLocalClinic && !canBootstrapClinic) {
    redirect("/clinic/unavailable");
  }

  if (!session.user.clinic?.id) {
    redirect("/clinic/select");
  }

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
