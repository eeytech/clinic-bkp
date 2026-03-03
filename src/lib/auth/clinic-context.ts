import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { clinicsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

type AuthorizedClinicContext =
  | { ok: true; clinicId: string; applicationId: string }
  | { ok: false; status: number; error: string };

export async function getAuthorizedClinicContextForApi(): Promise<AuthorizedClinicContext> {
  const session = await auth.api.getSession();

  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const expectedAppSlug = process.env.NEXT_PUBLIC_APP_SLUG;
  if (expectedAppSlug && session.user.application !== expectedAppSlug) {
    return { ok: false, status: 403, error: "Forbidden: invalid application context" };
  }

  const clinicId = session.user.clinic?.id;
  const applicationId = session.user.applicationId;

  if (!clinicId || !applicationId) {
    return { ok: false, status: 403, error: "Forbidden: active clinic context required" };
  }

  const clinic = await db.query.clinicsTable.findFirst({
    where: and(
      eq(clinicsTable.id, clinicId),
      eq(clinicsTable.applicationId, applicationId),
    ),
    columns: { id: true },
  });

  if (!clinic) {
    return { ok: false, status: 403, error: "Forbidden: clinic not linked to application" };
  }

  return { ok: true, clinicId, applicationId };
}
