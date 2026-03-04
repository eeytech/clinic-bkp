import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth/jwt";

// Substitua pelo seu email de administrador configurado no eeytech-admin
const SUPER_ADMIN_EMAIL = "seu-email@eeytech.com.br";

export async function getSessionPermissions() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  console.log("MBAC Debug - Token encontrado:", !!token);
  if (!token) {
    console.log("MBAC Debug - Nenhum token encontrado no cookie");
    return null;
  }
  return verifyAccessToken(token);
}

export async function requireModulePermission(
  moduleSlug: string,
  action: string,
) {
  console.log("MBAC Debug - Verificando permissão");
  console.log("MBAC Debug - moduleSlug:", moduleSlug);
  console.log("MBAC Debug - action:", action);
  const payload = await getSessionPermissions();
  console.log("MBAC Debug - Payload decodificado:", payload);
  const appSlug = process.env.NEXT_PUBLIC_APP_SLUG;
  console.log("MBAC Debug - AppSlug esperado:", appSlug);

  // 1. Se não houver sessão, redireciona para o login
  if (!payload) {
    console.warn("MBAC Debug - Payload nulo, redirecionando para login");
    redirect("/authentication");
  }

  // 2. BYPASS: Se for o Super Admin, ignora as verificações de módulo
  if (payload.email === SUPER_ADMIN_EMAIL) {
    console.log("MBAC Debug - Super Admin detectado, bypass de permissões");
    return payload;
  }

  // 3. Garante que o token gerado pertence a esta aplicação específica
  if (payload.application !== appSlug) {
    console.error("MBAC Debug - Application inválida", {
      tokenApplication: payload.application,
      expectedApplication: appSlug,
    });
    redirect("/authentication?error=invalid_application");
  }

  // 4. Verifica se o módulo e a ação existem no token
  const userActions = payload.modules[moduleSlug] || [];
  console.log("MBAC Debug - Actions do módulo", {
    moduleSlug,
    userActions,
    requiredAction: action,
  });
  const hasPermission =
    userActions.includes("FULL") || userActions.includes(action);
  console.log("MBAC Debug - Resultado da verificação", {
    hasPermission,
  });

  if (!hasPermission) {
    console.warn("MBAC Debug - Permissão negada", {
      moduleSlug,
      requiredAction: action,
      userActions,
    });
    // 🚀 CORREÇÃO: Redireciona para /authentication para evitar o loop infinito no /dashboard
    redirect("/authentication?error=insufficient_permissions");
  }
  console.log("MBAC Debug - Permissão concedida");

  return payload;
}
