import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET!;

export interface SessionCompany {
  id: string;
  name: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  name?: string;
  application: string;
  applicationId?: string;
  modules: Record<string, string[]>;
  isApplicationAdmin?: boolean;
  companyIds?: string[];
  companies?: SessionCompany[];
  activeCompanyId?: string;
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}
