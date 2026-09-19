# Euphoria — Cultural Fest People's Choice Rating App

> **Phase 1: Foundation Architecture** · Next.js 16 (App Router) + Firebase (Auth, Firestore, Admin SDK) + Tailwind CSS v4 + TypeScript Strict.

A high-concurrency, mobile-first performance rating platform for college cultural festivals. Built to handle 1,000–5,000 students voting live on individual acts during festival night, with strict campus email validation, instant real-time voting states, zero hardcoded festival metadata, and comprehensive administrative controls.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) | Fast SSR/SSG, Server Actions, modern routing |
| **Language** | TypeScript 5 (strict mode) | End-to-end type safety with Firestore Converters |
| **Database & Auth** | Firebase 11 & Firebase Admin 13 | Live data synchronization, custom claims, emulators |
| **Styling & Design** | Tailwind CSS v4 + Radix UI Primitives | CSS token variables, 48px tap targets, light-only palette |
| **Form Validation** | React Hook Form + Zod 3 | Client & server schema validation mirroring Firestore Rules |
| **Drag & Drop** | `@dnd-kit/core` & `@dnd-kit/sortable` | Touch & keyboard accessible performance reordering |
| **Testing** | Vitest 2 + `@firebase/rules-unit-testing` | Unit testing against offline Firestore emulator |

---

## Quick Start (3 Commands)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start emulators and seed mock data (in terminal 1)
npm run emulators
# In terminal 2:
npm run seed:emulator

# 3. Start development server (in terminal 2)
npm run dev
```

Visit:
- **Student Portal**: [http://localhost:3000](http://localhost:3000)
- **Organizer Admin Console**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
  - Admin login: `admin@example.test` / `Admin@1234`
  - Emulator UI: [http://localhost:4000](http://localhost:4000)

---

## Architecture Overview

### 1. Auth Status State Machine

The client application resolves user state into one of 7 mutually exclusive statuses, driving route resolution and access control:

```
[Firebase onIdTokenChanged]
           │
           ▼
    Signed out?  ───────►  "signed-out" (Allowed: /, /login, /register, /forgot-password)
           │ No
           ▼
  Has admin claim?  ───►  "admin" (Allowed: /admin, /admin/*)
           │ No
           ▼
 Eligible domain?  ────►  "not-eligible" (Redirects: /not-eligible)
           │ Yes
           ▼
Profile in Firestore? ─►  "needs-profile" (Redirects: /complete-profile)
           │ Yes
           ▼
  Email verified?  ────►  "unverified" (Redirects: /verify-email)
           │ Yes
           ▼
      "ready"  ────────►  (Allowed: /vote)
```

### 2. Live Voting & Real-Time Isolation

- **Single Listener**: Phase 1 subscribes to exactly **one** real-time snapshot: `events/{eventId}/state/current` via `onSnapshot`.
- **Cached One-Off Reads**: Departments, categories, and lineups are loaded via one-off `getDocs` calls with in-memory caching to minimize Firestore read quotas.
- **Event Isolation**: Rehearsal events are marked `isTest: true`, rendering an amber **TEST MODE** banner across both student dashboard and organizer console. Switching between test and live events is performed via a confirmation dialog in Settings.

---

## Environment Variables Reference

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Client & Server | Base URL of the application (no trailing slash) |
| `NEXT_PUBLIC_USE_EMULATORS` | Client | `"true"` to target local Firebase Emulators on ports 9099 / 8080 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client | Firebase Project ID (e.g. `demo-euphoria`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client | Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | Firebase Auth Domain |
| `FIREBASE_ADMIN_PROJECT_ID` | Server | Admin SDK Project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server | Admin SDK Service Account Email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Server | Admin SDK RSA Private Key (escaped `\n` supported) |
| `FIRESTORE_EMULATOR_HOST` | Server / Scripts | `"localhost:8080"` for Admin SDK emulator auto-detection |
| `FIREBASE_AUTH_EMULATOR_HOST` | Server / Scripts | `"localhost:9099"` for Admin SDK emulator auto-detection |

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Next.js development server with Turbopack |
| `npm run build` | Compiles optimized production build with static pre-rendering |
| `npm run start` | Runs the compiled production build |
| `npm run lint` | Runs ESLint checks across all components and pages |
| `npm run typecheck` | Validates TypeScript types across the entire project (`tsc --noEmit`) |
| `npm run emulators` | Boots the Firebase Auth & Firestore Emulator Suite |
| `npm run test:rules` | Runs Vitest Firestore security rules suite against local emulator |
| `npm run bootstrap` | Idempotent production bootstrap: creates `config/app`, event, and `state/current` |
| `npm run set-admin -- <email>` | Grants `admin: true` custom claim to a verified account and updates directory |
| `npm run seed:emulator` | Populates emulator with 7 departments, 8 categories, 12 performances, and test users |

---

## Full Documentation

For detailed cloud deployment steps, service account configuration, and the day-of festival runbook, consult [SETUP.md](./SETUP.md).
