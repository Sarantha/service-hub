/**
 * One-time backfill: seeds BookingSlot counters from Appointment documents
 * that already existed before the daily-capacity feature shipped (created
 * by the old, uncapped controller). Without this, the capacity check would
 * under-count any date that already had legacy bookings.
 *
 * Not wired into app boot — run manually once after deploying this feature:
 *   node server/scripts/backfillBookingSlots.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const BookingSlot = require('../models/BookingSlot');

function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  await mongoose.connect(process.env.MONGO_DB_CONNECTION);
  console.log('Connected to MongoDB.');

  const appointments = await Appointment.find(
    { isDeleted: false, status: { $ne: 'Cancelled' } },
    { branchId: 1, scheduledDateTime: 1 }
  ).lean();

  const counts = new Map(); // `${branchId}|${dateKey}` -> count
  for (const appt of appointments) {
    const key = `${appt.branchId}|${toDateKey(appt.scheduledDateTime)}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let upserted = 0;
  for (const [key, count] of counts.entries()) {
    const [branchId, date] = key.split('|');
    await BookingSlot.findOneAndUpdate(
      { branchId, date },
      { $set: { count } },
      { upsert: true }
    );
    upserted += 1;
  }

  console.log(`Backfilled ${upserted} BookingSlot document(s) from ${appointments.length} existing appointment(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
