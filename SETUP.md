# Setup & Deployment Guide — Euphoria Cultural Fest App

This document covers local development with the Firebase Emulator Suite, deploying to a real Firebase production project, creating the first admin account, and festival day-of checklist operations.

---

## Part 1: Local Development with Firebase Emulators

Follow these steps from a fresh clone or workspace:

### 1. Prerequisites
- **Node.js**: v20 or v22 LTS (or v24+)
- **Java JRE 11+**: Required by Firebase Emulator Suite (Firestore and Auth emulators run on Java). Verify with `java -version`.
- **npm** or **pnpm**

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Copy the sample environment variables:
```bash
copy .env.example .env.local
```
The default `.env.local` is already configured for the Firebase Emulator Suite:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_USE_EMULATORS=true
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-euphoria
NEXT_PUBLIC_FIREBASE_API_KEY=fake-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-euphoria.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-euphoria.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

FIREBASE_ADMIN_PROJECT_ID=demo-euphoria
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-dummy@demo-euphoria.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7..."

FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### 4. Start Firebase Emulators
In a dedicated terminal window:
```bash
npm run emulators
```
This boots:
- **Auth Emulator**: `http://localhost:9099`
- **Firestore Emulator**: `http://localhost:8080`
- **Emulator UI**: `http://localhost:4000`

### 5. Seed Emulator Data
In a second terminal window, populate initial departments, categories, lineup acts, and test accounts:
```bash
npm run seed:emulator
```
This prints the login credentials:
- **Admin**: `admin@example.test` (password: `Admin@1234`)
- **Students**:
  - `student1@college.test` / `Student@1234`
  - `student2@college.test` / `Student@1234`
  - `student3@college.test` / `Student@1234`

### 6. Start Next.js Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000):
- Student landing & voting: [http://localhost:3000](http://localhost:3000)
- Admin organizer console: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

---

## Part 2: Real Firebase Project Setup (Production)

When deploying for your actual college cultural fest:

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it (e.g. `fest-euphoria-2026`).
3. Disable Google Analytics (optional).

### 2. Enable Authentication
1. Navigate to **Build → Authentication** → **Get started**.
2. Under **Sign-in method**, enable **Email/Password**:
   - Enable "Email/Password".
   - Leave "Email link (passwordless sign-in)" disabled.
3. Under **Settings → Templates → Email address verification**:
   - Customize sender name and fest logo.
   - Action URL: `https://your-domain.com/login`

### 3. Create Cloud Firestore Database
1. Navigate to **Build → Firestore Database** → **Create database**.
2. Select your nearest Google Cloud region (e.g. `asia-south1` for Mumbai).
3. Start in **Production mode**.

### 4. Generate Service Account Private Key
1. Go to **Project settings** (gear icon) → **Service accounts**.
2. Ensure **Firebase Admin SDK** is selected with Node.js.
3. Click **Generate new private key**, save the JSON file securely.

### 5. Deploy Firestore Security Rules & Indexes
Login to the Firebase CLI and switch to your real project:
```bash
npx firebase login
npx firebase use <your-project-id>
npx firebase deploy --only firestore
```
This uploads:
- `firestore.rules` (validates shape, roles, domain eligibility, timestamps, test mode immutability)
- `firestore.indexes.json` (composite indexes for user queries)

### 6. Configure Production Environment Variables
On your production hosting platform (Vercel, Firebase App Hosting, Cloud Run, etc.):
```env
NEXT_PUBLIC_APP_URL=https://your-fest-domain.com
NEXT_PUBLIC_USE_EMULATORS=false

# Firebase Web App Config (from Project settings → General → Your apps)
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin SDK Credentials (from Service Account JSON)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 7. Run Bootstrap Script
Initialize `config/app`, the default live event, and `state/current`:
```bash
npm run bootstrap
```

### 8. Create the First Admin
To establish the initial administrator:
1. Create the user in Firebase Auth:
   - Either through the registration page, OR
   - Directly in Firebase Console → Authentication → **Add user**.
2. Run the `set-admin` script:
   ```bash
   npm run set-admin -- your-admin-email@domain.com
   ```
3. The user must sign out and sign in again for the `admin: true` claim to be refreshed in their ID token.

---

## Part 3: Festival Day-of Operations Checklist

### Pre-Event (1–2 Days Before)
- [ ] Go to **Admin → Settings → Registration & Domains**:
  - Verify `allowedEmailDomains` contains only your campus domains (no placeholder `college.edu`).
  - Set `blockPlusAddressing: true` to prevent duplicate accounts.
  - Turn **Registration OPEN** so students can register and verify emails in advance.
- [ ] Verify **Admin → Departments**:
  - All participating clubs and societies are configured with proper names and colors.
- [ ] Verify **Admin → Categories**:
  - All contest categories are configured with correct overall weights.
- [ ] Check **Admin → Students**:
  - Verify registered students count and that students are receiving verification emails.

### Rehearsal / Soundcheck
- [ ] In **Admin → Settings → Events**:
  - Create a test event: `Rehearsal 2026` with `isTest: true`.
  - Duplicate lineup from your live event.
  - Set `Rehearsal 2026` as **Active**.
  - Verify the amber **TEST MODE** banner appears across both Admin Console and `/vote`.
  - Conduct practice voting runs.

### Day-of Go-Live (30 Minutes Before Showtime)
- [ ] In **Admin → Settings → Events**:
  - Click **Set as Active** on the real, live event (`isTest: false`).
  - Read and confirm the warning dialog: *"Students will now see the LIVE event."*
- [ ] In **Admin → Lineup**:
  - Verify the order of performances matches the master stage schedule.
  - Drag and drop or use up/down arrows to reorder acts if there are last-minute schedule changes.
- [ ] Check **Admin → Overview**:
  - Ensure all items in the Event Readiness Checklist are green.

---

## Part 4: Common Pitfalls & Troubleshooting

1. **Trailing Slash in `NEXT_PUBLIC_APP_URL`**:
   - Never include a trailing slash: use `https://fest.college.edu`, NOT `https://fest.college.edu/`. Trailing slashes break verification email action URLs.

2. **Private Key Newline Escaping**:
   - In `.env` or Vercel environment variables, multiline RSA keys must represent newlines as `\n`. The codebase automatically normalizes `\n` to real newlines, but ensure the string starts with `"-----BEGIN PRIVATE KEY-----`.

3. **Composite Index Errors**:
   - If filtering students by department in Admin shows a Firestore error, ensure `firestore.indexes.json` was deployed via `firebase deploy --only firestore:indexes`.

4. **First Admin Not Redirecting to Admin**:
   - Custom claims require token refresh. After running `npm run set-admin`, the user must explicitly sign out and sign back in.
