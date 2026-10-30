import { toCsv } from "@/lib/csv";
import { nightsBetween } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/server/services/appointments";
import type { BookingWithRelations } from "@/server/services/bookings";

export function appointmentsCsv(rows: AppointmentWithRelations[]): string {
  return toCsv(rows, [
    { header: "Reference", value: (r) => r.reference },
    { header: "Status", value: (r) => r.status },
    { header: "Scheduled at (UTC)", value: (r) => r.scheduledAt },
    { header: "Facility", value: (r) => r.facility.name },
    { header: "Specialty", value: (r) => r.specialty },
    { header: "Doctor", value: (r) => r.doctor?.name },
    { header: "Package", value: (r) => r.package?.name },
    { header: "Patient", value: (r) => r.user.name },
    { header: "Patient email", value: (r) => r.user.email },
    { header: "Patient phone", value: (r) => r.user.phone },
    { header: "Nationality", value: (r) => r.user.nationality },
    { header: "Price", value: (r) => r.price },
    { header: "Currency", value: (r) => r.currency },
    { header: "Created at (UTC)", value: (r) => r.createdAt },
  ]);
}

export function bookingsCsv(rows: BookingWithRelations[]): string {
  return toCsv(rows, [
    { header: "Reference", value: (r) => r.reference },
    { header: "Status", value: (r) => r.status },
    { header: "Hotel", value: (r) => r.hotel.name },
    { header: "Room type", value: (r) => r.roomType.name },
    { header: "Check-in", value: (r) => r.checkIn.toISOString().slice(0, 10) },
    { header: "Check-out", value: (r) => r.checkOut.toISOString().slice(0, 10) },
    { header: "Nights", value: (r) => nightsBetween(r.checkIn, r.checkOut) },
    { header: "Rooms", value: (r) => r.rooms },
    { header: "Guests", value: (r) => r.guests },
    { header: "Nightly rate", value: (r) => r.nightlyRate },
    { header: "Total", value: (r) => r.totalPrice },
    { header: "Currency", value: (r) => r.currency },
    { header: "Guest", value: (r) => r.user.name },
    { header: "Guest email", value: (r) => r.user.email },
    { header: "Guest phone", value: (r) => r.user.phone },
    { header: "Nationality", value: (r) => r.user.nationality },
    { header: "Linked appointment", value: (r) => r.appointment?.reference },
    { header: "Created at (UTC)", value: (r) => r.createdAt },
  ]);
}

export function exportFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
}
