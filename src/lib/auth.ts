import { and, eq, inArray, notInArray } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/db";
import {
  clinicPaymentMethodsEnum,
  clinicsTable,
  userClinicsTable,
  usersTable,
} from "@/db/schema";
import { verifyAccessToken } from "@/lib/auth/jwt";

const DEFAULT_CLINIC_VALUES = {
  responsibleName: "Nao informado",
  croResponsavel: "Nao informado",
  paymentMethods: [
    "Pix",
  ] as (typeof clinicPaymentMethodsEnum.enumValues)[number][],
  addressStreet: "Nao informado",
  addressNumber: "S/N",
  addressNeighborhood: "Nao informado",
  addressCity: "Nao informado",
  addressState: "SP" as const,
  addressZipcode: "00000000",
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const getSessionLogic = async (input?: unknown) => {
  try {
    void input;
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) return null;

    const payload = verifyAccessToken(token);
    if (!payload) return null;

    const existingUser = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, payload.email),
    });

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

    const applicationId = payload.applicationId ?? payload.application;

    const companies = (payload.companies ?? []).filter(
      (company): company is { id: string; name: string } =>
        Boolean(company?.id) && isUuid(company.id) && Boolean(company?.name),
    );

    const companyIds = companies.map((company) => company.id);

    if (companyIds.length > 0) {
      for (const company of companies) {
        await db
          .insert(clinicsTable)
          .values({
            id: company.id,
            applicationId,
            name: company.name,
            ...DEFAULT_CLINIC_VALUES,
          })
          .onConflictDoUpdate({
            target: clinicsTable.id,
            set: {
              applicationId,
              name: company.name,
              updatedAt: new Date(),
            },
          });

        await db
          .insert(userClinicsTable)
          .values({
            userId: payload.sub,
            clinicId: company.id,
          })
          .onConflictDoNothing();
      }

      await db
        .delete(userClinicsTable)
        .where(
          and(
            eq(userClinicsTable.userId, payload.sub),
            notInArray(userClinicsTable.clinicId, companyIds),
          ),
        );
    } else {
      await db
        .delete(userClinicsTable)
        .where(eq(userClinicsTable.userId, payload.sub));
    }

    const activeClinicId =
      payload.activeCompanyId && companyIds.includes(payload.activeCompanyId)
        ? payload.activeCompanyId
        : companyIds[0] ?? null;

    const clinics =
      companyIds.length > 0
        ? await db.query.clinicsTable.findMany({
            where: and(
              inArray(clinicsTable.id, companyIds),
              eq(clinicsTable.applicationId, applicationId),
            ),
          })
        : [];

    const clinicsById = new Map(clinics.map((clinic) => [clinic.id, clinic]));
    const orderedClinics = companyIds
      .map((companyId) => clinicsById.get(companyId) ?? null)
      .filter((clinic): clinic is (typeof clinics)[number] => clinic !== null);

    const activeClinic = activeClinicId ? clinicsById.get(activeClinicId) ?? null : null;

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
        activeClinicId,
      },
      session: {
        expires: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
      },
    };
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
