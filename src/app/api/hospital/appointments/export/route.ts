import { csvResponse, parseQuery, withErrorHandling } from "@/lib/api";
import { optionalFacilityScope, requireApiRole } from "@/lib/session";
import { appointmentListQuerySchema } from "@/lib/validators/appointment";
import { exportAppointmentsForStaff } from "@/server/services/appointments";
import { appointmentsCsv, exportFilename } from "@/server/exports";
import { recordAudit } from "@/server/services/audit";

export const GET = withErrorHandling(async (req) => {
  const user = await requireApiRole("HOSPITAL_ADMIN", "SUPER_ADMIN");
  const query = parseQuery(req, appointmentListQuerySchema);
  const scope = optionalFacilityScope(user, query.facilityId);
  const rows = await exportAppointmentsForStaff(scope, query);
  await recordAudit({ actorId: user.id, action: "appointment.export", entityType: "Appointment", metadata: { rows: rows.length, facilityId: scope ?? "all" } });
  return csvResponse(appointmentsCsv(rows), exportFilename("appointments"));
});
