import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/jwt";

// Substitua pelo seu email de administrador configurado no eeytech-admin
const SUPER_ADMIN_EMAIL = "seu-email@eeytech.com.br";

export async function getSessionPermissions() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export async function requireModulePermission(
  moduleSlug: string,
  action: string,
) {
  const payload = await getSessionPermissions();
  const appSlug = process.env.NEXT_PUBLIC_APP_SLUG;

  // 1. Se não houver sessão, redireciona para o login
  if (!payload) redirect("/authentication");

  // 2. BYPASS: Se for o Super Admin, ignora as verificações de módulo
  if (payload.email === SUPER_ADMIN_EMAIL) return payload;

  // 3. Garante que o token gerado pertence a esta aplicação específica
  if (payload.application !== appSlug) {
    redirect("/authentication?error=invalid_application");
  }

  // 4. Verifica se o módulo e a ação existem no token
  const userActions = payload.modules[moduleSlug] || [];
  const hasPermission =
    userActions.includes("FULL") || userActions.includes(action);

  if (!hasPermission) {
    // 🚀 CORREÇÃO: Redireciona para /authentication para evitar o loop infinito no /dashboard
    redirect("/authentication?error=insufficient_permissions");
  }

  return payload;
}
