# Email authentication setup

Banger Picks supports **phone SMS**, **email + password**, and **email magic link** sign-in. All methods use the production Firebase project configured in `src/lib/firebase.ts`.

## Firebase Console

1. Open [Firebase Console](https://console.firebase.google.com/) → project **banger-picks** → **Authentication**.
2. **Sign-in method**
   - Enable **Email/Password**.
   - Enable **Email link (passwordless sign-in)** on the same provider (follow Firebase’s “Email link” steps for web).
   - Keep **Phone** enabled if you use SMS sign-in.
3. **Settings → Authorized domains**
   - **Primary:** `bangerpicks.com`, `www.bangerpicks.com`
   - **Development:** `localhost`
   - **Legacy (until 301 verified):** `banger-picks.web.app`, `banger-picks.firebaseapp.com`
   - Do **not** set `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` to `bangerpicks.com` unless you complete [Firebase Auth custom domain](https://firebase.google.com/docs/auth/custom-domain) (`auth.bangerpicks.com`). The client should keep `banger-picks.firebaseapp.com` for `authDomain`.
4. **Phone SMS:** confirm reCAPTCHA / domain allowlists include `bangerpicks.com` (and `www.bangerpicks.com` if users can land there before redirect).
5. **Templates** (optional): customize verification, password reset, and sign-in link emails.

## Local testing

```bash
npm run dev
```

Open `http://localhost:3000/dashboard/`, tap **Sign In**, choose **Email**:

| Flow | Steps |
|------|--------|
| Email + password | Create account or sign in; verification email is sent on sign-up but picks are not blocked |
| Magic link | Enter email → **Send sign-in link** → open link in the **same browser** (uses `localStorage` for the stored email) |
| Forgot password | Use **Forgot password?** on the password form |

Magic link lands on **`/auth/continue/`**, which completes `signInWithEmailLink` and redirects to the dashboard.

If you open the magic link on another device, the continue page prompts for your email address.

## Phone (unchanged)

Phone sign-in still requires reCAPTCHA and SMS. Use [Firebase test phone numbers](https://firebase.google.com/docs/auth/web/phone-auth#test-with-verification-codes) for local testing without SMS.

## Deploy

After changing auth UI or `/auth/continue/`, run `npm run build-test-deploy` and:

```bash
firebase deploy --only hosting
```

No Firestore rule changes are required for email auth.
