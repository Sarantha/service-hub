const { z } = require('zod');

const PHONE_REGEX = /^0\d{9}$/;
const VEHICLE_REG_REGEX = /^[A-Za-z]{3}-\d{4}$/;
const SERVICE_TYPES = ['Full Service', 'Oil Change', 'Brake Service', 'AC Service', 'Engine Diagnostics', 'Other'];

// Staff-side booking (Super Admin / Service Advisor create appointment on
// behalf of a customer) — assignedTechnicianId is optional/staff-only.
const createAppointmentSchema = z.object({
  customerName: z.string().trim().min(1, 'Customer name is required.'),
  customerPhone: z.string().trim().regex(PHONE_REGEX, 'Phone number must be 10 digits starting with 0.'),
  vehicleRegNo: z.string().trim().regex(VEHICLE_REG_REGEX, "Vehicle registration must follow the format 'ABC-1234'."),
  vehicleDetails: z.string().trim().min(1, 'Vehicle details are required.'),
  serviceType: z.enum(SERVICE_TYPES),
  scheduledDateTime: z.coerce.date({ message: 'A valid scheduled date/time is required.' }),
  assignedTechnicianId: z.string().trim().optional().nullable()
});

// Portal-side self-booking — vehicleRegNo is pinned server-side from the
// verified token, and vehicleDetails/assignedTechnicianId are resolved/not
// applicable, so none of those are accepted from the body.
const portalBookSchema = createAppointmentSchema
  .omit({ vehicleRegNo: true, vehicleDetails: true, assignedTechnicianId: true })
  .extend({ customerName: z.string().trim().min(1, 'Your name is required.') });

const rescheduleSchema = z.object({
  scheduledDateTime: z.coerce.date({ message: 'A valid new scheduled date/time is required.' })
});

module.exports = { createAppointmentSchema, portalBookSchema, rescheduleSchema };
