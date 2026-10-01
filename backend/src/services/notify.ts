import { todayISO, nowTime } from './time.js';
import { newId } from '../auth.js';
import { one } from '../db.js';

export interface NotificationInput {
  patientId: string;
  type: string;
  title: string;
  body: string;
  deepLink?: string;
  time?: string;
}

/** Creates a patient notification; used as the side-effect channel of every flow. */
export async function notify(input: NotificationInput) {
  await one(
    `INSERT INTO notifications (id, patient_id, type, title, body, date, time, deep_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [newId('nt'), input.patientId, input.type, input.title, input.body, todayISO(), input.time ?? nowTime(), input.deepLink ?? '/'],
  );
}
