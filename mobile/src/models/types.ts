export type Role = 'patient' | 'doctor' | 'pharmacist' | 'delivery' | 'admin';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sex: 'M' | 'F';
  birthDate: string; // ISO
  city: string;
  address?: string;
  bloodType?: string;
  heightCm?: number;
  weightKg?: number;
  emergencyContact?: { name: string; phone: string; relation: string };
  /** Medical record sections, served as part of the patient profile by the API. */
  allergies?: Allergy[];
  conditions?: Condition[];
  treatments?: Treatment[];
  vaccines?: Vaccine[];
  examResults?: ExamResult[];
}

export interface Allergy {
  id: string;
  name: string;
  severity: 'légère' | 'modérée' | 'sévère';
}

export interface Condition {
  id: string;
  name: string;
  year: number;
  type: 'antécédent' | 'chirurgie' | 'maladie chronique';
  note?: string;
}

export interface Treatment {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  since: string;
  prescriber?: string;
  active: boolean;
}

export interface Vaccine {
  id: string;
  name: string;
  date: string;
  nextDue?: string;
}

export interface ExamResult {
  id: string;
  name: string;
  category: 'analyse' | 'imagerie';
  date: string;
  status: 'disponible' | 'en cours de traitement';
  conclusion?: string;
}

export interface MedicalDocument {
  id: string;
  name: string;
  type: 'ordonnance' | 'analyse' | 'imagerie' | 'compte-rendu' | 'certificat' | 'vaccination';
  date: string;
  source: 'aura' | 'imported';
  sizeKb: number;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  hospitalId: string;
  experienceYears: number;
  languages: string[];
  rating: number;
  reviewsCount: number;
  fee: number;
  videoFee?: number;
  chatFee?: number;
  videoAvailable: boolean;
  chatAvailable: boolean;
  inPersonAvailable: boolean;
  bio: string;
  status: 'disponible' | 'occupé' | 'indisponible';
  workingDays: number[]; // 0-6
  slotTimes: string[];
}

export interface Specialty {
  id: string;
  name: string;
  icon: string;
}

export interface Hospital {
  id: string;
  name: string;
  type: 'Hôpital' | 'Centre de santé' | 'Clinique';
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  specialties: string[];
  services: string[];
  hours: string;
  rating: number;
  emergency: boolean;
}

export interface Pharmacy {
  id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  hours: string;
  rating: number;
  onDuty: boolean;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  services: string[];
  medicationIds: string[];
  latitude: number;
  longitude: number;
}

export interface Medication {
  id: string;
  name: string;
  form: 'comprimé' | 'comprimé effervescent' | 'gélule' | 'sirop' | 'injection' | 'pommade' | 'sachet' | 'solution';
  dosage: string;
  lab: string;
  category: string;
  description: string;
  requiresPrescription: boolean;
  unitPrice: number;
  pharmacyIds: string[];
}

export interface PrescriptionLine {
  medicationId?: string;
  name: string;
  dosage: string;
  form: string;
  quantity: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  code: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  establishment: string;
  date: string;
  expiryDate: string;
  status: 'active' | 'expired';
  source: 'aura' | 'imported';
  lines: PrescriptionLine[];
  instructions?: string;
  consultationId?: string;
}

export type ConsultationType = 'video' | 'chat' | 'in-person';
export type AppointmentStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  type: ConsultationType;
  status: AppointmentStatus;
  date: string; // ISO yyyy-mm-dd
  time: string; // HH:mm
  motif: string;
  symptoms: string[];
  fee: number;
  establishment: string;
  paid: boolean;
  paymentId?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  sender: 'patient' | 'doctor' | 'system';
  kind: 'text' | 'image' | 'document' | 'audio' | 'prescription' | 'system';
  text?: string;
  mediaLabel?: string;
  mediaSizeKb?: number;
  audioDuration?: string;
  prescriptionId?: string;
  time: string; // HH:mm
}

export interface ChatThread {
  id: string;
  appointmentId?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  status: 'active' | 'ended';
  endedAt?: string;
  messages: ChatMessage[];
}

/**
 * Groq-generated clinical analysis. Physician-only: the API only includes it
 * in payloads served to a doctor session — patients never receive it.
 */
export interface AiDiagnostic {
  summary: string;
  possibleConditions: { name: string; likelihood: 'faible' | 'moyenne' | 'élevée' }[];
  redFlags: string[];
  recommendedSpecialty: string;
  questions: string[];
  urgencyNote: string;
}

/** Doctor-only diagnostic block attached to an AI-generated compte-rendu. */
export interface SummaryDiagnostic {
  hypothesis: string;
  differentials: string[];
  severity: string;
  followUp: string;
}

export interface ConsultationSummary {
  id: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  consultationType: ConsultationType;
  date: string;
  motif: string;
  symptoms: string[];
  importantInfo: string[];
  observations: string;
  recommendations: string[];
  treatments: { name: string; dosage: string; frequency: string; duration: string }[];
  exams: string[];
  nextSteps: string[];
  documents: { name: string; type: string }[];
  aiGenerated?: boolean;
  /** Present only in doctor sessions (see AiDiagnostic). */
  aiDiagnostic?: SummaryDiagnostic;
  generatedAt: string;
  prescriptionId?: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded';
export type PaymentMethod = 'mtn_momo' | 'orange_money' | 'card';

export interface Payment {
  id: string;
  reference: string;
  label: string;
  category: 'consultation' | 'medkit' | 'order';
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  date: string;
  time: string;
  relatedId?: string;
}

export interface OrderItem {
  medicationId: string;
  name: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
}

export interface CartItem {
  medicationId: string;
  name: string;
  category: string;
  form: Medication['form'];
  dosage: string;
  unitPrice: number;
  quantity: number;
  requiresPrescription: boolean;
}

export interface Order {
  id: string;
  pharmacyId: string;
  pharmacyName: string;
  items: OrderItem[];
  mode: 'delivery' | 'pickup';
  address?: string;
  total: number;
  status: 'en attente' | 'confirmée' | 'prête' | 'en livraison' | 'livrée' | 'annulée';
  prescriptionId?: string;
  paymentId?: string;
  date: string;
  time: string;
  /** Secret proof handed to the pharmacist/courier at delivery. Customer-only. */
  handoverCode?: string;
  courierId?: string;
  courierName?: string;
  cancelReason?: string;
}

export interface Courier {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  vehicle: 'moto' | 'voiture' | string;
  pharmacyId: string;
  active: boolean;
}

/** Order as seen by the pharmacy/delivery workspaces (enriched, no code). */
export interface WorkspaceOrder extends Order {
  paid: boolean;
  patientName?: string;
  patientPhone?: string;
  prescription?: { code: string; doctorName: string; expiryDate: string };
}

/** One entry of an order's progression timeline (oldest first). */
export interface OrderEvent {
  id: string;
  status: Order['status'];
  label: string;
  actor: 'patient' | 'pharmacist' | 'delivery' | 'system';
  note?: string;
  createdAt: string; // ISO datetime
}

/** Pharmacist order view: the order plus its progression timeline. */
export interface WorkspaceOrderDetail {
  order: WorkspaceOrder;
  events: OrderEvent[];
}

/** Courier enriched with their current workload, for assignment screens. */
export interface CourierWithLoad extends Courier {
  activeDeliveries: number;
}

/** Medication as stocked by the pharmacist's own pharmacy. */
export interface PharmacyMedication extends Medication {
  stock: number;
  lowStockThreshold: number;
  lowStock: boolean;
}

/** Editable payload when creating or updating a pharmacy medication. */
export interface MedicationDraft {
  name: string;
  form: Medication['form'];
  dosage: string;
  lab: string;
  category: string;
  description: string;
  requiresPrescription: boolean;
  unitPrice: number;
  stock: number;
}

export type NotificationType =
  | 'appointment'
  | 'message'
  | 'prescription'
  | 'renewal'
  | 'payment'
  | 'order'
  | 'document'
  | 'summary';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  date: string;
  time: string;
  read: boolean;
  deepLink: string;
}

export interface SymptomPrep {
  id: string;
  symptoms: string[];
  duration: string;
  intensity: string;
  evolution: string;
  details?: string;
  orientation: string;
  priority: 'faible' | 'modérée' | 'élevée';
  aiGenerated?: boolean;
  /** Present only in doctor sessions (see AiDiagnostic). */
  aiDiagnostic?: AiDiagnostic;
  /** Present only in the doctor workspace listing (who sent the prep). */
  patientId?: string;
  patientName?: string;
  createdAt: string;
  sentToDoctor: boolean;
}

export interface DoctorPatientFile {
  id: string;
  firstName: string;
  lastName: string;
  sex: 'M' | 'F';
  age: number;
  phone: string;
  bloodType: string;
  heightCm: number;
  weightKg: number;
  allergies: string[];
  conditions: string[];
  treatments: string[];
  lastVisit: string;
  lastMotif: string;
  city: string;
}

export interface ProfessionalApplication {
  type: 'hospital' | 'pharmacy';
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  manager: string;
  documents: string[];
}

// ---------------------------------------------------------------------------
// Admin back-office (GET/POST /api/admin/*)
// ---------------------------------------------------------------------------

export type ActivationStatus = 'pending' | 'active' | 'rejected';

/** Doctor profile as seen by the admin, with its account and activation state. */
export interface AdminDoctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  hospitalId: string | null;
  hospitalName: string | null;
  experienceYears: number;
  fee: number;
  bio: string;
  rating: number;
  reviewsCount: number;
  activationStatus: ActivationStatus;
  activatedAt: string | null;
  rejectionReason: string | null;
  account: { phone: string | null; email: string | null; createdAt: string | null };
}

export interface AdminOverview {
  doctors: { pending: number; active: number; rejected: number };
  hospitals: number;
  pharmacies: number;
  pendingApplications: number;
}

export interface AdminHospital extends Hospital {
  doctorCount: number;
}

export interface AdminPharmacy extends Pharmacy {
  medicationCount: number;
  openOrders: number;
}

/** Stored copy of a `POST /api/professionals/apply` submission. */
export interface AdminApplication {
  id: string;
  type: 'hospital' | 'pharmacy';
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  manager: string;
  documents: string[];
  status: string;
  createdAt: string;
}
