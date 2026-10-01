# Aura Health

Telemedicine platform (**100 % en français**) made of two apps in this monorepo:

| Directory | Stack | Description |
| --- | --- | --- |
| [`mobile/`](mobile) | Expo + React Native + TypeScript | Patient / doctor / pharmacy / delivery app |
| [`backend/`](backend) | Node.js + Express + PostgreSQL | API: auth, catalog, appointments & payment, chat consultations, AI summaries, prescriptions, pharmacy cart & delivery tracking, wallet, notifications, symptom triage |

## Quick start

```bash
# 1) Backend — create the database and seed it
cd backend
npm install
cp .env.example .env        # adjust PGUSER/PGHOST, add GROQ_API_KEY (optional)
npm run db:reset
npm start                   # http://localhost:4000

# 2) Mobile app
cd ../mobile
npm install
npx expo start              # scan the QR code (Expo Go) or press a / i / w
```

- **Android emulator**: the app automatically targets `http://10.0.2.2:4000`.
- **Web / iOS simulator**: `http://localhost:4000`.
- **Physical device**: `EXPO_PUBLIC_API_URL=http://<local-ip>:4000 npx expo start`.

## AI provider (optional)

Symptom analysis and consultation summaries use an OpenAI-compatible provider —
Groq (default) or GLM/Zhipu — selected via `AI_PROVIDER`. Without an API key the
flows fall back to a local rule-based engine. See the
[backend README](backend/README.md) for details.

## Checks

- `npm run typecheck` (mobile)
- `npm run smoke` (backend)
- `npx tsx scripts/contract.ts` (mobile ↔ API contract; backend must be running)

Demo accounts are listed in the [mobile README](mobile/README.md).
