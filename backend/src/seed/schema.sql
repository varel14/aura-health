-- Aura Health schema. Applied in full by `npm run db:reset` (drop + recreate + seed).

CREATE TABLE specialties (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE hospitals (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  city        TEXT NOT NULL,
  district    TEXT NOT NULL,
  address     TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  specialties JSONB NOT NULL DEFAULT '[]',
  services    JSONB NOT NULL DEFAULT '[]',
  hours       TEXT NOT NULL DEFAULT '',
  rating      REAL NOT NULL DEFAULT 0,
  emergency   BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE doctors (
  id                  TEXT PRIMARY KEY,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  specialty           TEXT NOT NULL,
  hospital_id         TEXT REFERENCES hospitals(id),
  experience_years    INT NOT NULL DEFAULT 0,
  languages           JSONB NOT NULL DEFAULT '[]',
  rating              REAL NOT NULL DEFAULT 0,
  reviews_count       INT NOT NULL DEFAULT 0,
  fee                 INT NOT NULL,
  video_fee           INT,
  chat_fee            INT,
  video_available     BOOLEAN NOT NULL DEFAULT true,
  chat_available      BOOLEAN NOT NULL DEFAULT true,
  in_person_available BOOLEAN NOT NULL DEFAULT true,
  bio                 TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'disponible',
  working_days        JSONB NOT NULL DEFAULT '[]',
  slot_times          JSONB NOT NULL DEFAULT '[]',
  activation_status   TEXT NOT NULL DEFAULT 'pending' CHECK (activation_status IN ('pending', 'active', 'rejected')),
  activated_at        TIMESTAMPTZ,
  rejection_reason    TEXT
);

CREATE TABLE pharmacies (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  city               TEXT NOT NULL,
  district           TEXT NOT NULL,
  address            TEXT NOT NULL,
  phone              TEXT NOT NULL,
  hours              TEXT NOT NULL DEFAULT '',
  rating             REAL NOT NULL DEFAULT 0,
  on_duty            BOOLEAN NOT NULL DEFAULT false,
  delivery_available BOOLEAN NOT NULL DEFAULT false,
  pickup_available   BOOLEAN NOT NULL DEFAULT true,
  services           JSONB NOT NULL DEFAULT '[]',
  medication_ids     JSONB NOT NULL DEFAULT '[]',
  latitude           REAL NOT NULL DEFAULT 0,
  longitude          REAL NOT NULL DEFAULT 0
);

CREATE TABLE medications (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  form                 TEXT NOT NULL,
  dosage               TEXT NOT NULL,
  lab                  TEXT NOT NULL DEFAULT '',
  category             TEXT NOT NULL DEFAULT '',
  description          TEXT NOT NULL DEFAULT '',
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  unit_price           INT NOT NULL,
  pharmacy_ids         JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE couriers (
  id          TEXT PRIMARY KEY,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  city        TEXT NOT NULL DEFAULT '',
  vehicle     TEXT NOT NULL DEFAULT 'moto',
  pharmacy_id TEXT REFERENCES pharmacies(id),
  active      BOOLEAN NOT NULL DEFAULT true
);

-- Per-pharmacy stock for the pharmacist's end-to-end medication management
-- (the global medications row stays the shared catalog entry).
CREATE TABLE pharmacy_medications (
  pharmacy_id         TEXT NOT NULL REFERENCES pharmacies(id),
  medication_id       TEXT NOT NULL REFERENCES medications(id),
  stock               INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pharmacy_id, medication_id)
);

CREATE TABLE patients (
  id                TEXT PRIMARY KEY,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT NOT NULL,
  sex               TEXT NOT NULL CHECK (sex IN ('M', 'F')),
  birth_date        DATE NOT NULL,
  city              TEXT NOT NULL DEFAULT '',
  address           TEXT,
  blood_type        TEXT,
  height_cm         INT,
  weight_kg         REAL,
  emergency_contact JSONB,
  allergies         JSONB NOT NULL DEFAULT '[]',
  conditions        JSONB NOT NULL DEFAULT '[]',
  treatments        JSONB NOT NULL DEFAULT '[]',
  vaccines          JSONB NOT NULL DEFAULT '[]',
  exam_results      JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  role         TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'pharmacist', 'delivery', 'admin')),
  phone        TEXT NOT NULL UNIQUE,
  email        TEXT,
  pin_hash     TEXT NOT NULL,
  display_name TEXT NOT NULL,
  patient_id   TEXT REFERENCES patients(id),
  doctor_id    TEXT REFERENCES doctors(id),
  pharmacy_id  TEXT REFERENCES pharmacies(id),
  courier_id   TEXT REFERENCES couriers(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token      TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE doctor_patients (
  id        TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL REFERENCES doctors(id),
  file      JSONB NOT NULL
);

CREATE TABLE appointments (
  id           TEXT PRIMARY KEY,
  doctor_id    TEXT NOT NULL REFERENCES doctors(id),
  patient_id   TEXT NOT NULL REFERENCES patients(id),
  patient_name TEXT NOT NULL,
  patient_age  INT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('video', 'chat', 'in-person')),
  status       TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'completed', 'cancelled')),
  date         DATE NOT NULL,
  time         TEXT NOT NULL,
  motif        TEXT NOT NULL,
  symptoms     JSONB NOT NULL DEFAULT '[]',
  fee          INT NOT NULL,
  establishment TEXT NOT NULL DEFAULT '',
  paid         BOOLEAN NOT NULL DEFAULT false,
  payment_id   TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id, date);

CREATE TABLE chat_threads (
  id             TEXT PRIMARY KEY,
  appointment_id TEXT REFERENCES appointments(id),
  doctor_id      TEXT NOT NULL REFERENCES doctors(id),
  patient_id     TEXT NOT NULL REFERENCES patients(id),
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  ended_at       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id              TEXT PRIMARY KEY,
  thread_id       TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  seq             INT NOT NULL,
  sender          TEXT NOT NULL CHECK (sender IN ('patient', 'doctor', 'system')),
  kind            TEXT NOT NULL DEFAULT 'text',
  text            TEXT,
  media_label     TEXT,
  media_size_kb   INT,
  audio_duration  TEXT,
  prescription_id TEXT,
  time            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_thread ON chat_messages(thread_id, seq);

CREATE TABLE consultation_summaries (
  id                TEXT PRIMARY KEY,
  appointment_id    TEXT UNIQUE REFERENCES appointments(id),
  patient_id        TEXT NOT NULL REFERENCES patients(id),
  doctor_id         TEXT NOT NULL REFERENCES doctors(id),
  doctor_name       TEXT NOT NULL,
  doctor_specialty  TEXT NOT NULL,
  consultation_type TEXT NOT NULL,
  date              DATE NOT NULL,
  motif             TEXT NOT NULL,
  symptoms          JSONB NOT NULL DEFAULT '[]',
  important_info    JSONB NOT NULL DEFAULT '[]',
  observations      TEXT NOT NULL DEFAULT '',
  recommendations   JSONB NOT NULL DEFAULT '[]',
  treatments        JSONB NOT NULL DEFAULT '[]',
  exams             JSONB NOT NULL DEFAULT '[]',
  next_steps        JSONB NOT NULL DEFAULT '[]',
  documents         JSONB NOT NULL DEFAULT '[]',
  prescription_id   TEXT,
  ai_generated      BOOLEAN NOT NULL DEFAULT false,
  ai_diagnostic     JSONB,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prescriptions (
  id                TEXT PRIMARY KEY,
  code              TEXT NOT NULL UNIQUE,
  patient_id        TEXT NOT NULL REFERENCES patients(id),
  patient_name      TEXT NOT NULL,
  doctor_id         TEXT REFERENCES doctors(id),
  doctor_name       TEXT NOT NULL,
  doctor_specialty  TEXT NOT NULL,
  establishment     TEXT NOT NULL DEFAULT '',
  date              DATE NOT NULL,
  expiry_date       DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  source            TEXT NOT NULL DEFAULT 'aura' CHECK (source IN ('aura', 'imported')),
  lines             JSONB NOT NULL DEFAULT '[]',
  instructions      TEXT,
  consultation_id   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);

CREATE TABLE payments (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id),
  reference   TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('consultation', 'medkit', 'order')),
  amount      INT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  method      TEXT NOT NULL CHECK (method IN ('mtn_momo', 'orange_money', 'card')),
  date        DATE NOT NULL,
  time        TEXT NOT NULL,
  related_id  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_patient ON payments(patient_id);

CREATE TABLE cart_items (
  patient_id            TEXT NOT NULL REFERENCES patients(id),
  medication_id         TEXT NOT NULL REFERENCES medications(id),
  name                  TEXT NOT NULL,
  category              TEXT NOT NULL,
  form                  TEXT NOT NULL,
  dosage                TEXT NOT NULL,
  unit_price            INT NOT NULL,
  quantity              INT NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (patient_id, medication_id)
);

CREATE TABLE orders (
  id                 TEXT PRIMARY KEY,
  patient_id         TEXT NOT NULL REFERENCES patients(id),
  pharmacy_id        TEXT NOT NULL REFERENCES pharmacies(id),
  pharmacy_name      TEXT NOT NULL,
  items              JSONB NOT NULL DEFAULT '[]',
  mode               TEXT NOT NULL CHECK (mode IN ('delivery', 'pickup')),
  address            TEXT,
  total              INT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'en attente' CHECK (status IN ('en attente', 'confirmée', 'prête', 'en livraison', 'livrée', 'annulée')),
  prescription_id    TEXT,
  payment_id         TEXT,
  handover_code_hash TEXT,
  courier_id         TEXT REFERENCES couriers(id),
  cancel_reason      TEXT,
  validated_at       TIMESTAMPTZ,
  prepared_at        TIMESTAMPTZ,
  assigned_at        TIMESTAMPTZ,
  delivered_at       TIMESTAMPTZ,
  date               DATE NOT NULL,
  time               TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_patient ON orders(patient_id);
CREATE INDEX idx_orders_pharmacy ON orders(pharmacy_id, status);
CREATE INDEX idx_orders_courier ON orders(courier_id, status);

-- Immutable progression timeline: one row per transition (creation, validation,
-- preparation, courier assignment, pickup, delivery, cancellation).
CREATE TABLE order_events (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  label      TEXT NOT NULL,
  actor      TEXT NOT NULL DEFAULT 'system' CHECK (actor IN ('patient', 'pharmacist', 'delivery', 'system')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_events_order ON order_events(order_id, created_at);

CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  date       DATE NOT NULL,
  time       TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT false,
  deep_link  TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_patient ON notifications(patient_id);

CREATE TABLE symptom_preps (
  id             TEXT PRIMARY KEY,
  patient_id     TEXT NOT NULL REFERENCES patients(id),
  symptoms       JSONB NOT NULL DEFAULT '[]',
  duration       TEXT NOT NULL DEFAULT '',
  intensity      TEXT NOT NULL DEFAULT '',
  evolution      TEXT NOT NULL DEFAULT '',
  details        TEXT,
  orientation    TEXT NOT NULL DEFAULT '',
  priority       TEXT NOT NULL DEFAULT 'faible' CHECK (priority IN ('faible', 'modérée', 'élevée')),
  ai_generated   BOOLEAN NOT NULL DEFAULT false,
  ai_diagnostic  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_to_doctor BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE documents (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,
  date       DATE NOT NULL,
  source     TEXT NOT NULL DEFAULT 'aura' CHECK (source IN ('aura', 'imported')),
  size_kb    INT NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE professional_applications (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL CHECK (type IN ('hospital', 'pharmacy')),
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT NOT NULL,
  city       TEXT NOT NULL,
  address    TEXT NOT NULL,
  manager    TEXT NOT NULL,
  documents  JSONB NOT NULL DEFAULT '[]',
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
