import { QueryResultRow } from 'pg';

type Row = Record<string, any>;

/**
 * DB rows are snake_case; the API speaks the mobile app's camelCase types.
 * These mappers are the single place where the two meet.
 */

export function mapSpecialty(r: Row) {
  return { id: r.id, name: r.name, icon: r.icon };
}

export function mapHospital(r: Row) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    city: r.city,
    district: r.district,
    address: r.address,
    phone: r.phone,
    email: r.email,
    description: r.description,
    specialties: r.specialties,
    services: r.services,
    hours: r.hours,
    rating: Number(r.rating),
    emergency: r.emergency,
  };
}

export function mapDoctor(r: Row) {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    specialty: r.specialty,
    hospitalId: r.hospital_id,
    experienceYears: r.experience_years,
    languages: r.languages,
    rating: Number(r.rating),
    reviewsCount: r.reviews_count,
    fee: r.fee,
    videoFee: r.video_fee ?? undefined,
    chatFee: r.chat_fee ?? undefined,
    videoAvailable: r.video_available,
    chatAvailable: r.chat_available,
    inPersonAvailable: r.in_person_available,
    bio: r.bio,
    status: r.status,
    workingDays: r.working_days,
    slotTimes: r.slot_times,
    activationStatus: r.activation_status ?? 'active',
    activatedAt: r.activated_at ?? undefined,
    rejectionReason: r.rejection_reason ?? undefined,
  };
}

export function mapPharmacy(r: Row) {
  return {
    id: r.id,
    name: r.name,
    city: r.city,
    district: r.district,
    address: r.address,
    phone: r.phone,
    hours: r.hours,
    rating: Number(r.rating),
    onDuty: r.on_duty,
    deliveryAvailable: r.delivery_available,
    pickupAvailable: r.pickup_available,
    services: r.services,
    medicationIds: r.medication_ids,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
  };
}

export function mapMedication(r: Row) {
  return {
    id: r.id,
    name: r.name,
    form: r.form,
    dosage: r.dosage,
    lab: r.lab,
    category: r.category,
    description: r.description,
    requiresPrescription: r.requires_prescription,
    unitPrice: r.unit_price,
    pharmacyIds: r.pharmacy_ids,
  };
}

/** Medication as stocked by one pharmacy (pharmacist catalog view). */
export function mapPharmacyMedication(r: Row) {
  const stock = Number(r.stock ?? 0);
  const threshold = Number(r.low_stock_threshold ?? 5);
  return {
    ...mapMedication(r),
    stock,
    lowStockThreshold: threshold,
    lowStock: stock <= threshold,
  };
}

export function mapCourier(r: Row) {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    phone: r.phone,
    city: r.city,
    vehicle: r.vehicle,
    pharmacyId: r.pharmacy_id,
    active: r.active,
  };
}

export function mapPatient(r: Row) {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    sex: r.sex,
    birthDate: toDateOnly(r.birth_date),
    city: r.city,
    address: r.address ?? undefined,
    bloodType: r.blood_type ?? undefined,
    heightCm: r.height_cm ?? undefined,
    weightKg: r.weight_kg ?? undefined,
    emergencyContact: r.emergency_contact ?? undefined,
    allergies: r.allergies ?? [],
    conditions: r.conditions ?? [],
    treatments: r.treatments ?? [],
    vaccines: r.vaccines ?? [],
    examResults: r.exam_results ?? [],
  };
}

export function mapAppointment(r: Row) {
  return {
    id: r.id,
    doctorId: r.doctor_id,
    patientId: r.patient_id,
    patientName: r.patient_name,
    patientAge: r.patient_age,
    type: r.type,
    status: r.status,
    date: toDateOnly(r.date),
    time: r.time,
    motif: r.motif,
    symptoms: r.symptoms,
    fee: r.fee,
    establishment: r.establishment,
    paid: r.paid,
    paymentId: r.payment_id ?? undefined,
    notes: r.notes ?? undefined,
  };
}

export function mapThread(r: Row) {
  return {
    id: r.id,
    appointmentId: r.appointment_id ?? undefined,
    doctorId: r.doctor_id,
    doctorName: r.doctor_name,
    doctorSpecialty: r.doctor_specialty,
    patientId: r.patient_id,
    status: r.status,
    endedAt: r.ended_at ?? undefined,
    messages: r.messages ?? [],
  };
}

export function mapMessage(r: Row) {
  return {
    id: r.id,
    threadId: r.thread_id,
    sender: r.sender,
    kind: r.kind,
    text: r.text ?? undefined,
    mediaLabel: r.media_label ?? undefined,
    mediaSizeKb: r.media_size_kb ?? undefined,
    audioDuration: r.audio_duration ?? undefined,
    prescriptionId: r.prescription_id ?? undefined,
    time: r.time,
  };
}

/**
 * Same rule as mapSymptomPrep: `aiDiagnostic` (hypothesis, differentials…) is
 * physician-only and stays out of every patient-facing payload.
 */
export function mapSummary(r: Row, opts: { includeDiagnostic?: boolean } = {}) {
  return {
    id: r.id,
    appointmentId: r.appointment_id,
    doctorId: r.doctor_id,
    doctorName: r.doctor_name,
    doctorSpecialty: r.doctor_specialty,
    consultationType: r.consultation_type,
    date: toDateOnly(r.date),
    motif: r.motif,
    symptoms: r.symptoms,
    importantInfo: r.important_info,
    observations: r.observations,
    recommendations: r.recommendations,
    treatments: r.treatments,
    exams: r.exams,
    nextSteps: r.next_steps,
    documents: r.documents,
    aiGenerated: r.ai_generated ?? false,
    ...(opts.includeDiagnostic && r.ai_diagnostic ? { aiDiagnostic: r.ai_diagnostic } : {}),
    generatedAt: r.generated_at,
    prescriptionId: r.prescription_id ?? undefined,
  };
}

export function mapPrescription(r: Row) {
  return {
    id: r.id,
    code: r.code,
    patientId: r.patient_id,
    patientName: r.patient_name,
    doctorId: r.doctor_id ?? '',
    doctorName: r.doctor_name,
    doctorSpecialty: r.doctor_specialty,
    establishment: r.establishment,
    date: toDateOnly(r.date),
    expiryDate: toDateOnly(r.expiry_date),
    status: r.status,
    source: r.source,
    lines: r.lines,
    instructions: r.instructions ?? undefined,
    consultationId: r.consultation_id ?? undefined,
  };
}

export function mapPayment(r: Row) {
  return {
    id: r.id,
    reference: r.reference,
    label: r.label,
    category: r.category,
    amount: r.amount,
    status: r.status,
    method: r.method,
    date: toDateOnly(r.date),
    time: r.time,
    relatedId: r.related_id ?? undefined,
  };
}

export function mapOrder(r: Row) {
  return {
    id: r.id,
    pharmacyId: r.pharmacy_id,
    pharmacyName: r.pharmacy_name,
    items: r.items,
    mode: r.mode,
    address: r.address ?? undefined,
    total: r.total,
    status: r.status,
    prescriptionId: r.prescription_id ?? undefined,
    paymentId: r.payment_id ?? undefined,
    date: toDateOnly(r.date),
    time: r.time,
  };
}

export function mapCartItem(r: Row) {
  return {
    medicationId: r.medication_id,
    name: r.name,
    category: r.category,
    form: r.form,
    dosage: r.dosage,
    unitPrice: r.unit_price,
    quantity: r.quantity,
    requiresPrescription: r.requires_prescription,
  };
}

export function mapNotification(r: Row) {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    date: toDateOnly(r.date),
    time: r.time,
    read: r.read,
    deepLink: r.deep_link,
  };
}

/**
 * The AI diagnostic is reserved for physicians: it is only mapped into the
 * payload when `includeDiagnostic` is set by a doctor-authenticated route.
 */
export function mapSymptomPrep(r: Row, opts: { includeDiagnostic?: boolean } = {}) {
  return {
    id: r.id,
    symptoms: r.symptoms,
    duration: r.duration,
    intensity: r.intensity,
    evolution: r.evolution,
    details: r.details ?? undefined,
    orientation: r.orientation,
    priority: r.priority,
    aiGenerated: r.ai_generated ?? false,
    ...(opts.includeDiagnostic && r.ai_diagnostic ? { aiDiagnostic: r.ai_diagnostic } : {}),
    createdAt: toDateOnly(r.created_at),
    sentToDoctor: r.sent_to_doctor,
  };
}

export function mapDocument(r: Row) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    date: toDateOnly(r.date),
    source: r.source,
    sizeKb: r.size_kb,
  };
}

export function mapDoctorPatientFile(r: Row) {
  return { id: r.id, ...(r.file as object) };
}

/** pg parses DATE columns into a Date at local midnight; local getters recover
 * the stored yyyy-mm-dd exactly (toISOString would shift the day east of UTC). */
export function toDateOnly(value: unknown): string {
  if (value instanceof Date) {
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

export function rowsOf<T extends QueryResultRow>(result: { rows: T[] }): T[] {
  return result.rows;
}
