import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  appointments as seedAppointments,
  prescriptions as seedPrescriptions,
  payments as seedPayments,
  notifications as seedNotifications,
  threads as seedThreads,
  summaries as seedSummaries,
  patient as seedPatient,
  medicalDocuments as seedDocuments,
} from '@/data';
import {
  Appointment,
  AppNotification,
  CartItem,
  ChatMessage,
  ChatThread,
  ConsultationSummary,
  MedicalDocument,
  Patient,
  Payment,
  Prescription,
  SymptomPrep,
} from '@/models/types';
import { ApiError, api, getToken, onTokenChange, setToken } from '@/services/api';
import { onChatMessage, onChatSummary, onChatThreadEnded, syncChatRealtime } from '@/services/chatRealtime';

interface AppDataContextValue {
  patient: Patient;
  appointments: Appointment[];
  prescriptions: Prescription[];
  payments: Payment[];
  cart: CartItem[];
  threads: ChatThread[];
  summaries: ConsultationSummary[];
  notifications: AppNotification[];
  documents: MedicalDocument[];
  symptomPreps: SymptomPrep[];
  /** True while the initial server sync for the current session is running. */
  hydrating: boolean;
  /** Re-pulls every collection from the backend. */
  refresh: () => Promise<void>;
  updatePatient: (patch: Partial<Patient>) => Promise<void>;
  addAppointment: (a: Appointment) => Promise<Appointment>;
  updateAppointment: (id: string, patch: Partial<Appointment>) => Promise<void>;
  addPrescription: (p: Prescription) => Promise<Prescription>;
  updatePrescription: (id: string, patch: Partial<Prescription>) => Promise<void>;
  addPayment: (p: Payment) => Promise<Payment>;
  updatePayment: (id: string, patch: Partial<Payment>) => Promise<void>;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => Promise<void>;
  setCartQuantity: (medicationId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  /** Notifications are created server-side by the flows themselves. */
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'date'>) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addMessage: (threadId: string, msg: Omit<ChatMessage, 'id' | 'threadId'>) => Promise<ChatMessage>;
  endThread: (threadId: string) => Promise<void>;
  addDocument: (d: Omit<MedicalDocument, 'id'>) => Promise<MedicalDocument>;
  addSymptomPrep: (p: Omit<SymptomPrep, 'id' | 'createdAt' | 'sentToDoctor' | 'orientation' | 'priority'>) => Promise<SymptomPrep>;
  markSymptomPrepSent: (id: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [patient, setPatient] = useState<Patient>(seedPatient);
  const [appointments, setAppointments] = useState<Appointment[]>(seedAppointments);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(seedPrescriptions);
  const [payments, setPayments] = useState<Payment[]>(seedPayments);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>(seedThreads);
  const [summaries, setSummaries] = useState<ConsultationSummary[]>(seedSummaries);
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);
  const [documents, setDocuments] = useState<MedicalDocument[]>(seedDocuments);
  const [symptomPreps, setSymptomPreps] = useState<SymptomPrep[]>([]);
  const [hydrating, setHydrating] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    setHydrating(true);
    // Doctor sessions legitimately get 403 on patient-scoped collections
    // (profile, payments, cart, notifications…) — one denied endpoint must
    // not sink the whole sync, so denied calls resolve to `null` instead.
    const soft = async <T,>(call: Promise<T>): Promise<T | null> => {
      try {
        return await call;
      } catch (err) {
        if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return null;
        throw err;
      }
    };
    try {
      const [me, appts, rxs, pays, cartItems, ths, sums, notifs, docs, preps] = await Promise.all([
        soft(api<Patient>('/api/patient/me')),
        soft(api<Appointment[]>('/api/appointments')),
        soft(api<Prescription[]>('/api/prescriptions')),
        soft(api<Payment[]>('/api/payments')),
        soft(api<CartItem[]>('/api/pharmacy/cart')),
        soft(api<ChatThread[]>('/api/consultations/threads')),
        soft(api<ConsultationSummary[]>('/api/consultations/summaries')),
        soft(api<AppNotification[]>('/api/notifications')),
        soft(api<MedicalDocument[]>('/api/patient/documents')),
        soft(api<SymptomPrep[]>('/api/symptoms/preps')),
      ]);
      if (me) setPatient(me);
      if (appts) setAppointments(appts);
      if (rxs) setPrescriptions(rxs);
      if (pays) setPayments(pays);
      if (cartItems) setCart(cartItems);
      if (ths) setThreads(ths);
      if (sums) setSummaries(sums);
      if (notifs) setNotifications(notifs);
      if (docs) setDocuments(docs);
      if (preps) setSymptomPreps(preps);
    } catch (err) {
      // A persisted token the server no longer knows (db reset, expiry) ends
      // the session quietly instead of crashing the app.
      if (err instanceof ApiError && err.status === 401) setToken(null);
    } finally {
      setHydrating(false);
    }
  }, []);

  // Hydrate whenever a session appears, reset to the seed snapshot on logout.
  useEffect(() => {
    void refresh();
    // Temps réel du chat : le socket suit la session (ouverte, permutée,
    // fermée) et pousse les messages et clôtures reçus dans l'état local.
    syncChatRealtime(getToken());
    const applyMessage = onChatMessage(({ threadId, message }) => {
      // Dédoublonnage par id : l'émetteur a déjà ajouté le sien via la
      // réponse du POST ; la poussée socket met surtout à jour ses autres
      // sessions et l'appareil du correspondant.
      setThreads((list) =>
        list.map((t) =>
          t.id === threadId && !t.messages.some((m) => m.id === message.id)
            ? { ...t, messages: [...t.messages, message] }
            : t,
        ),
      );
    });
    const applyEnded = onChatThreadEnded(({ threadId, endedAt }) => {
      setThreads((list) =>
        list.map((t) =>
          t.id === threadId && t.status !== 'ended'
            ? { ...t, status: 'ended' as const, endedAt: endedAt ?? new Date().toTimeString().slice(0, 5) }
            : t,
        ),
      );
    });
    // Compte-rendu IA généré automatiquement à la clôture d'un fil : la
    // poussée ne porte que des identifiants, on relit via l'API pour obtenir
    // la version filtrée selon le rôle (le bloc diagnostique est réservé au
    // médecin).
    const applySummary = onChatSummary(({ summaryId }) => {
      void api<ConsultationSummary>(`/api/consultations/summaries/${summaryId}`)
        .then((fetched) => setSummaries((list) => [fetched, ...list.filter((s) => s.id !== fetched.id)]))
        .catch(() => {/* le prochain rafraîchissement rattrapera */});
    });
    const unsubscribeToken = onTokenChange((token) => {
      syncChatRealtime(token);
      if (token) {
        void refresh();
      } else {
        setPatient(seedPatient);
        setAppointments(seedAppointments);
        setPrescriptions(seedPrescriptions);
        setPayments(seedPayments);
        setCart([]);
        setThreads(seedThreads);
        setSummaries(seedSummaries);
        setNotifications(seedNotifications);
        setDocuments(seedDocuments);
        setSymptomPreps([]);
      }
    });
    return () => {
      unsubscribeToken();
      applyMessage();
      applyEnded();
      applySummary();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      patient,
      appointments,
      prescriptions,
      payments,
      cart,
      threads,
      summaries,
      notifications,
      documents,
      symptomPreps,
      hydrating,
      refresh,

      updatePatient: async (patch) => {
        const { emergencyContact, ...rest } = patch;
        const updated = await api<Patient>('/api/patient/me', {
          method: 'PATCH',
          body: { ...rest, ...(emergencyContact ? { emergencyContact } : {}) },
        });
        setPatient(updated);
      },

      // The server is the source of truth: it computes the fee, the patient
      // identity and the availability checks from the draft payload.
      addAppointment: async (a) => {
        const created = await api<Appointment>('/api/appointments', {
          method: 'POST',
          body: {
            doctorId: a.doctorId,
            type: a.type,
            date: a.date,
            time: a.time,
            motif: a.motif,
            symptoms: a.symptoms,
          },
        });
        setAppointments((list) => [created, ...list]);
        return created;
      },

      updateAppointment: async (id, patch) => {
        if (patch.status === 'cancelled') {
          const updated = await api<Appointment>(`/api/appointments/${id}/cancel`, { method: 'POST' });
          setAppointments((list) => list.map((a) => (a.id === id ? updated : a)));
          return;
        }
        // Consultation closure — either participant hanging up a video call or
        // the doctor marking it done. The server notifies the patient and
        // starts the AI summary generation in the same call (idempotent).
        if (patch.status === 'completed') {
          const updated = await api<Appointment>(`/api/appointments/${id}/complete`, {
            method: 'POST',
            body: patch.notes ? { notes: patch.notes } : undefined,
          });
          setAppointments((list) => list.map((a) => (a.id === id ? updated : a)));
          return;
        }
        if (patch.date && patch.time) {
          const updated = await api<Appointment>(`/api/appointments/${id}/reschedule`, {
            method: 'POST',
            body: { date: patch.date, time: patch.time },
          });
          setAppointments((list) => list.map((a) => (a.id === id ? updated : a)));
          return;
        }
        // Remaining patches (paid, paymentId…) arrive from their own flows
        // (payment, completion) — nothing else is patchable remotely.
        setAppointments((list) => list.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      },

      addPrescription: async (p) => {
        const payload = {
          patientId: p.patientId,
          lines: p.lines,
          instructions: p.instructions,
          establishment: p.establishment,
          doctorName: p.doctorName,
          date: p.date,
        };
        const created =
          p.source === 'imported'
            ? await api<Prescription>('/api/prescriptions/import', { method: 'POST', body: payload })
            : await api<Prescription>('/api/prescriptions', { method: 'POST', body: payload });
        setPrescriptions((list) => [created, ...list]);
        return created;
      },

      updatePrescription: async (id, patch) => {
        setPrescriptions((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },

      // PaymentSheet hands over a draft; the server computes amount, label and
      // reference, and applies the flow side effects (appointment paid, order
      // confirmed, cart cleared, notifications).
      addPayment: async (p) => {
        const created = await api<Payment>('/api/payments', {
          method: 'POST',
          body: { category: p.category, relatedId: p.relatedId, method: p.method, label: p.label },
        });
        setPayments((list) => [created, ...list]);
        // Side effects of the charge land in other collections — sync them.
        void refresh();
        return created;
      },

      updatePayment: async (id, patch) => {
        setPayments((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      },

      addToCart: async (item, quantity = 1) => {
        setCart(await api<CartItem[]>('/api/pharmacy/cart/items', { method: 'POST', body: { medicationId: item.medicationId, quantity } }));
      },

      setCartQuantity: async (medicationId, quantity) => {
        setCart(
          await api<CartItem[]>(`/api/pharmacy/cart/items/${medicationId}`, { method: 'PATCH', body: { quantity } }),
        );
      },

      clearCart: async () => {
        setCart(await api<CartItem[]>('/api/pharmacy/cart', { method: 'DELETE' }));
      },

      // Server-side flows create the real notifications; this is a no-op kept
      // for screen compatibility.
      addNotification: () => {},

      markNotificationRead: async (id) => {
        const updated = await api<AppNotification>(`/api/notifications/${id}/read`, { method: 'POST' });
        setNotifications((list) => list.map((n) => (n.id === id ? updated : n)));
      },

      markAllNotificationsRead: async () => {
        await api('/api/notifications/read-all', { method: 'POST' });
        setNotifications((list) => list.map((n) => ({ ...n, read: true })));
      },

      addMessage: async (threadId, msg) => {
        const created = await api<ChatMessage>(`/api/consultations/threads/${threadId}/messages`, {
          method: 'POST',
          body: {
            kind: msg.kind,
            text: msg.text,
            mediaLabel: msg.mediaLabel,
            mediaSizeKb: msg.mediaSizeKb,
            audioDuration: msg.audioDuration,
            prescriptionId: msg.prescriptionId,
          },
        });
        // Le push socket peut arriver avant la réponse HTTP : dédoublonnage
        // par id pour ne jamais afficher deux fois le même message.
        setThreads((list) =>
          list.map((t) =>
            t.id === threadId && !t.messages.some((m) => m.id === created.id)
              ? { ...t, messages: [...t.messages, created] }
              : t,
          ),
        );
        return created;
      },

      endThread: async (threadId) => {
        await api(`/api/consultations/threads/${threadId}/end`, { method: 'POST' });
        setThreads((list) =>
          list.map((t) =>
            t.id === threadId
              ? { ...t, status: 'ended' as const, endedAt: new Date().toTimeString().slice(0, 5) }
              : t,
          ),
        );
        // Ending the conversation also completes the linked appointment
        // server-side — re-pull so both parties' agendas show « terminé ».
        void refresh();
      },

      addDocument: async (d) => {
        const created = await api<MedicalDocument>('/api/patient/documents', {
          method: 'POST',
          body: { name: d.name, type: d.type, date: d.date, source: d.source, sizeKb: d.sizeKb },
        });
        setDocuments((list) => [created, ...list]);
        return created;
      },

      // The server runs the Groq analysis and answers with the patient-safe
      // fields (orientation + priority); the AI diagnostic stays server-side.
      addSymptomPrep: async (p) => {
        const created = await api<SymptomPrep>('/api/symptoms/analyze', {
          method: 'POST',
          body: {
            symptoms: p.symptoms,
            duration: p.duration,
            intensity: p.intensity,
            evolution: p.evolution,
            details: p.details,
          },
        });
        setSymptomPreps((list) => [created, ...list]);
        return created;
      },

      markSymptomPrepSent: async (id) => {
        const updated = await api<SymptomPrep>(`/api/symptoms/preps/${id}/send`, { method: 'POST' });
        setSymptomPreps((list) => list.map((p) => (p.id === id ? updated : p)));
      },
    }),
    [patient, appointments, prescriptions, payments, cart, threads, summaries, notifications, documents, symptomPreps, hydrating, refresh],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
