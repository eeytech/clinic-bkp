import { and, eq, inArray, notInArray } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import { clinicsTable, userClinicsTable, usersTable } from "@/db/schema";
import { JWTPayload, verifyAccessToken } from "@/lib/auth/jwt";

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const normalizeCompanies = (payload: JWTPayload) =>
  (payload.companies ?? []).filter(
    (company): company is { id: string; name: string } =>
      Boolean(company?.id) && isUuid(company.id) && Boolean(company?.name),
  );

const resolveActiveCompanyId = (
  payload: JWTPayload,
  companyIds: string[],
): string | null => {
  if (payload.activeCompanyId && companyIds.includes(payload.activeCompanyId)) {
    return payload.activeCompanyId;
  }

  return companyIds[0] ?? null;
};

const buildSessionFromPayload = (
  payload: JWTPayload,
  input: {
    companies: { id: string; name: string }[];
    clinics?: {
      id: string;
      name: string;
      applicationId: string | null;
    }[];
  },
) => {
  const applicationId = payload.applicationId ?? payload.application;
  const companyIds = input.companies.map((company) => company.id);
  const activeClinicId = resolveActiveCompanyId(payload, companyIds);

  const clinicsById = new Map((input.clinics ?? []).map((clinic) => [clinic.id, clinic]));
  const orderedClinics = companyIds
    .map((companyId) => clinicsById.get(companyId) ?? null)
    .filter(
      (
        clinic,
      ): clinic is { id: string; name: string; applicationId: string | null } =>
        clinic !== null,
    );
  const activeClinic = activeClinicId
    ? (clinicsById.get(activeClinicId) ?? null)
    : null;

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      permissions: payload.modules || {},
      isApplicationAdmin: payload.isApplicationAdmin ?? false,
      application: payload.application,
      applicationId,
      clinic: activeClinic,
      clinics: orderedClinics,
      companies: input.companies,
      activeClinicId,
      activeCompanyId: activeClinicId,
    },
    session: {
      expires: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    },
  };
};

const getSessionLogic = async (input?: unknown) => {
  try {
    void input;
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    console.log("Auth Debug - Token encontrado:", Boolean(token));

    if (!token) return null;

    const payload = verifyAccessToken(token);
    console.log("Auth Debug - Payload:", JSON.stringify(payload, null, 2));
    if (!payload) return null;

    const applicationId = payload.applicationId ?? payload.application;
    const companies = normalizeCompanies(payload);
    console.log("Auth Debug - Companies filtradas:", companies);

    const companyIds = companies.map((company) => company.id);
    console.log("Auth Debug - CompanyIds:", companyIds);

    try {
      const existingUser = await db.query.usersTable.findFirst({
        where: eq(usersTable.email, payload.email),
      });
      console.log("Auth Debug - existingUser:", existingUser);

      if (existingUser && existingUser.id.startsWith("pending_")) {
        await db.transaction(async (tx) => {
          await tx
            .update(usersTable)
            .set({ id: payload.sub, updatedAt: new Date() })
            .where(eq(usersTable.id, existingUser.id));

          await tx
            .update(userClinicsTable)
            .set({ userId: payload.sub })
            .where(eq(userClinicsTable.userId, existingUser.id));
        });
      } else if (!existingUser) {
        await db
          .insert(usersTable)
          .values({
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email.split("@")[0],
            emailVerified: true,
          })
          .onConflictDoNothing();
      }

      const localClinics =
        companyIds.length > 0
          ? await db.query.clinicsTable.findMany({
              where: and(
                inArray(clinicsTable.id, companyIds),
                eq(clinicsTable.applicationId, applicationId),
              ),
            })
          : [];

      const localClinicIds = localClinics.map((clinic) => clinic.id);

      if (localClinicIds.length > 0) {
        for (const clinicId of localClinicIds) {
          await db
            .insert(userClinicsTable)
            .values({
              userId: payload.sub,
              clinicId,
            })
            .onConflictDoNothing();
        }

        await db
          .delete(userClinicsTable)
          .where(
            and(
              eq(userClinicsTable.userId, payload.sub),
              notInArray(userClinicsTable.clinicId, localClinicIds),
            ),
          );
      } else {
        await db
          .delete(userClinicsTable)
          .where(eq(userClinicsTable.userId, payload.sub));
      }

      return buildSessionFromPayload(payload, {
        companies,
        clinics: localClinics,
      });
    } catch (dbError) {
      const errorMessage =
        dbError instanceof Error ? dbError.message : String(dbError);

      console.error(
        "[Auth] Falha ao sincronizar dados de sessao no banco. Continuando apenas com dados do token.",
        {
          error: errorMessage,
          applicationId,
          userId: payload.sub,
          companyIds,
        },
      );

      return buildSessionFromPayload(payload, {
        companies,
      });
    }
  } catch (error) {
    console.error("Erro ao processar sessao:", error);
    return null;
  }
};

export const auth = {
  getSession: getSessionLogic,
  api: {
    getSession: getSessionLogic,
  },
};
