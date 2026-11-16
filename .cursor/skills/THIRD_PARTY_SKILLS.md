# Third-party Agent Skills

Vendored skills for Cursor agents working on **Banger Picks**. Each folder is a copy of an upstream skill (see pinned commit) plus a `LICENSE` file. The repo-local skill [`build-test-deploy/`](build-test-deploy/) is **not** listed here (project-owned).

## Installed skills

| Skill | Source repository | Pinned commit | License | Why it fits Banger Picks |
| --- | --- | --- | --- | --- |
| `firebase-basics` | https://github.com/firebase/agent-skills | `99954a30898bb5ddc8152ee10e124dc3b4106bf7` | Apache-2.0 | Orientation across Auth, Firestore, Hosting, and CLI workflows used by this app. |
| `firebase-auth-basics` | https://github.com/firebase/agent-skills | `99954a30898bb5ddc8152ee10e124dc3b4106bf7` | Apache-2.0 | Firebase Auth patterns for the Next.js client and security-sensitive flows. |
| `firebase-firestore` | https://github.com/firebase/agent-skills | `99954a30898bb5ddc8152ee10e124dc3b4106bf7` | Apache-2.0 | Firestore data modeling, queries, and client SDK usage aligned with the app’s database layer. |
| `firebase-hosting-basics` | https://github.com/firebase/agent-skills | `99954a30898bb5ddc8152ee10e124dc3b4106bf7` | Apache-2.0 | Static export hosting, `firebase.json`, headers, and CDN deploy for `out/`. |
| `firebase-security-rules-auditor` | https://github.com/firebase/agent-skills | `99954a30898bb5ddc8152ee10e124dc3b4106bf7` | Apache-2.0 | Structured review of Firestore/storage rules alongside existing rules unit tests. |
| `firestore-rules-creation` | https://github.com/firebase/agent-skills | `99954a30898bb5ddc8152ee10e124dc3b4106bf7` | Apache-2.0 | Authoring and iterating on Firestore rules before running `npm run test:rules`. |
| `webapp-testing` | https://github.com/anthropics/skills | `1780c5e5a552fd4d1c9d6a7b0cab26b0c2bef064` | Apache-2.0 | Browser automation and UI verification patterns (Playwright-oriented QA). |
| `frontend-design` | https://github.com/anthropics/skills | `1780c5e5a552fd4d1c9d6a7b0cab26b0c2bef064` | Apache-2.0 | Intentional UI/visual direction when adding or refreshing Tailwind components. |
| `frontend-code-review` | https://github.com/DNM03/frontend-code-review | `033d1c5d8bccc311fc3c4362690a482016651b96` | MIT | Review checklist for React, Next.js, TypeScript, Tailwind, a11y, perf, security, and i18n. |

Upstream Apache skills from `anthropics/skills` also ship `LICENSE.txt` in-tree; this vendored copy includes the same text as `LICENSE` for consistency with other skills.

## Convention conflicts (do not edit upstream text)

Agents should prefer **Banger Picks** project rules and [`build-test-deploy/reference.md`](build-test-deploy/reference.md) when guidance disagrees with a vendored skill.

| Skill(s) | Upstream assumption | Banger Picks reality |
| --- | --- | --- |
| `firebase-hosting-basics`, `firebase-basics` | May mention Firebase **App Hosting** or dynamic backends | App uses **classic Hosting** + `output: 'export'` (static `out/`), not App Hosting or SSR. |
| `firebase-firestore`, rules skills | Examples may use server/admin SDKs in Next routes | UI is **static export**; privileged access belongs in **Cloud Functions**, not Next API routes. |
| `frontend-code-review` | Covers App Router server components, Server Actions, ISR/caching | Static export only—treat server-only Next features as **out of scope**; still use TS, client components, a11y, i18n, and TanStack Query sections. |
| `webapp-testing` | Python Playwright helper scripts | Repo’s primary gate is `npm run build-test-deploy` and Node unit/rules tests; adapt browser tests to this stack (e.g. serve `out/` or dev server) rather than assuming Python tooling. |
| `frontend-design` | Encourages distinctive one-off visual systems | Match existing **Tailwind** tokens, brand, and component patterns unless the user explicitly requests a redesign. |

## Candidates evaluated but not vendored

| Candidate | Reason rejected |
| --- | --- |
| **vercel-labs/agent-skills** (`react-best-practices`, `web-design-guidelines`, etc.) | No `LICENSE` file in the repository (README claims MIT only); license could not be verified. |
| **nolly-studio/components-build-skill** | No `LICENSE` file in the repository (README claims MIT only). |
| **anthropics/skills** — `doc-coauthoring` | No per-skill `LICENSE.txt`; excluded per license policy. |
| **anthropics/skills** — document/office skills (`docx`, `pdf`, `pptx`, `xlsx`) | Not relevant to this web/Firebase stack. |
| **firebase/agent-skills** — App Hosting, Data Connect, Crashlytics, Analytics, Remote Config, Xcode, extension migration | Wrong product surface or platform for Banger Picks. |
| **vercel-labs** — `deploy-to-vercel`, `vercel-optimize`, `react-native-skills` | Vercel deploy/mobile focus; hosting is Firebase. |
| **plugin87/ux-ui-agent-skills** | Broad multi-framework kit; overlap with `frontend-design` / `frontend-code-review` without a tighter fit than the set above. |
| **duolahypercho/startup-kit** | Express/MongoDB/scaffolding focus; not this Firebase static-export architecture. |

## Maintenance

To refresh a skill: check out the pinned commit in the source repo, diff against `.cursor/skills/<name>/`, copy updates, and update the pin and this table in a dedicated commit.