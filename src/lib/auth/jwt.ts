import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  sub: string; // ID do Usuário no banco do Admin
  email: string; // E-mail para Bypass de Super Admin
  application: string; // Slug da aplicação (ex: bye-carie)
  modules: Record<string, string[]>; // Permissões: { "financeiro": ["READ"] }
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    // Valida se o token foi assinado pela nossa secret central
    return jwt.verify(token, ACCESS_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}
