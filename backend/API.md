# CRM API — integration guide

The REST API between the Next.js website and this Laravel CRM.

- **Spec:** [`openapi.yaml`](./openapi.yaml) — 21 endpoints, fully documented.
- **Database:** MySQL. **Documents:** Laravel Storage, on a private disk, each
  row tied to its lead by foreign key.
- **Browsable:** `GET /api/docs` (Swagger UI). Open to everyone locally, behind
  an admin session in production.

---

## 1. Setup

```bash
# MySQL first — the app expects a database to exist.
mysql -u root -e "CREATE DATABASE sansekai_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed --class=AdminUserSeeder   # the administrator account
php artisan serve                             # http://localhost:8000
```

Variables that matter beyond the defaults:

| Variable | What it does |
|---|---|
| `DB_*` | MySQL connection. `DB_DATABASE` defaults to `sansekai_crm`. |
| `WEBSITE_API_KEY` | Shared secret for the two public submission endpoints. Generate with `php artisan key:generate --show`. |
| `LEAD_DOCUMENTS_DISK` | Disk for uploads. Defaults to `lead_documents`, which is **private** — keep it that way. |
| `ADMIN_USERNAME` | The administrator's login. Defaults to `admin`. |
| `ADMIN_PASSWORD` | Initial password. Left blank in local, the seeder generates one and prints it once. |

Locally, leaving `WEBSITE_API_KEY` empty allows unauthenticated submissions so
you can curl the endpoint. In production an empty key is a hard failure rather
than an open door.

On the Next.js side:

```dotenv
# .env.local — no NEXT_PUBLIC_ prefix on either of these
CRM_API_URL=http://localhost:8000/api
CRM_API_KEY=<same value as WEBSITE_API_KEY>
```

---

## 2. Authentication

**Website → CRM** (`/v1/website/*`): header `X-Api-Key: <key>`.

This is server-to-server. Call it from a route handler or server action, never
from the browser — a key in client JavaScript can be read by anyone who opens
devtools and used to write leads straight into the CRM.

**Back office** (everything else): `Authorization: Bearer <token>`, from
`POST /v1/auth/token`. Only users with `is_admin` are issued one, the same gate
the Filament panel applies. The token is shown once.

The CRM has **one administrator account** and no responsables — nothing is
assigned to anyone, so there is no owners table and no endpoint to manage one.
The account is created at installation with a username and a password;
`login` accepts either the username or the email, and the password is changed
afterwards through `PATCH /v1/auth/password`, which revokes every other token
on success.

---

## 3. Field mapping

### Financing form → `leads`

`POST /v1/website/leads/financement`, `multipart/form-data`.

| Website form field | API field | Column | Required | Notes |
|---|---|---|---|---|
| `nom` | `nom` | `nom` | yes | |
| `prenom` | `prenom` | `prenom` | yes | |
| `telephone` | `telephone` | `telephone` | yes | |
| `email` | `email` | `email` | yes | |
| `entreprise` | `entreprise` | `entreprise` | yes | |
| `dateCreation` | `dateCreation` | `date_creation` | yes | `YYYY-MM-DD` from the date picker. **Gated: ≥ 6 months.** |
| `adresse` | `adresse` | `adresse` | no | |
| `codePostal` | `codePostal` | `code_postal` | yes | |
| `ville` | `ville` | `ville` | yes | |
| `chiffreAffaire` | `chiffreAffaire` | `chiffre_affaire` | yes | Kept verbatim; parsed into `chiffre_affaire_cents`. **Gated: ≥ €7,000.** |
| `montant` | `montant` | `montant` | yes | Kept verbatim; parsed into `montant_cents`. |
| `codeCommercial` | `codeCommercial` | `code_commercial` | no | |
| `siteWeb` | `siteWeb` | `site_web` | yes | boolean |
| `siteWebUrl` | `siteWebUrl` | `site_web_url` | if `siteWeb` | |
| `reseaux` | `reseaux` | `reseaux` | yes | boolean |
| `reseauxOu` | `reseauxOu` | `reseaux_ou` | if `reseaux` | |
| `message` | `message` | `message` | no | |
| `uploads.idDocument` | `pieceIdentite` | `lead_documents` | no | kind `piece_identite` |
| `uploads.kbis` | `kbis` | `lead_documents` | **yes** | kind `kbis` |
| `uploads.statements` | `relevesBancaires` | `lead_documents` | **yes** | kind `releve_bancaire` |
| `uploads.accounting` | `documentsComptables` | `lead_documents` | **yes** | kind `comptable` |

Set server-side, never sent: `reference` (`FIN-2026-0142`), `service`
(`financement`), `status` (`nouveau`), `eligible_age`, `eligible_revenue`.

Uploads: PDF / JPG / PNG. The size ceiling is the **smaller** of
`leads.max_upload_kb` (10 MB) and PHP's own `upload_max_filesize`.

> **Check php.ini before blaming the API.** A stock PHP ships
> `upload_max_filesize=2M` and `post_max_size=8M`. PHP discards an oversized
> file *before* Laravel sees the request, so the rule that fires is
> "the file is required" — and the applicant is told they forgot a document they
> actually attached. Validation therefore advertises the real limit rather than
> the configured one, so the message is at least true. To accept the full 10 MB
> across four slots, set:
>
> ```ini
> upload_max_filesize = 10M
> post_max_size = 48M
> ```

### Business development form → `leads`

`POST /v1/website/leads/developpement`, JSON.

| Website form field | API field | Column | Required |
|---|---|---|---|
| `service` | `service` | `prestation` | yes |
| `nom` | `nom` | `nom` | yes |
| `prenom` | `prenom` | `prenom` | yes |
| `email` | `email` | `email` | yes |
| `telephone` | `telephone` | `telephone` | yes |
| `entreprise` | `entreprise` | `entreprise` | yes |
| `message` | `message` | `message` | no |

The form's select sends the **title** of a service; map it to the enum before
posting:

| Form option | `service` value |
|---|---|
| Création de site Web | `site_web` |
| Création de LOGO | `logo` |
| Campagne publicitaire sur les réseaux | `campagne_publicitaire` |

### Enumerations

Identical to the front end's `lib/crm/config.ts`:

- **status** — `nouveau`, `a_examiner`, `qualifie`, `en_cours`, `approuve`, `refuse`
- **service** — `financement`, `developpement`
- **prestation** — `site_web`, `logo`, `campagne_publicitaire`
- **document kind** — `piece_identite`, `kbis`, `releve_bancaire`, `comptable`, `autre`
- **activity kind** — `creation`, `statut`, `note`, `assignation`, `appel`, `email`, `document`

---

## 4. Consuming it from Next.js

### Submitting a financing lead

The browser posts to your own route handler; the route handler holds the key and
forwards to the CRM. `FormData` passes straight through, files included.

```ts
// src/app/api/leads/financement/route.ts
export async function POST(request: Request) {
  const form = await request.formData();

  const response = await fetch(
    `${process.env.CRM_API_URL}/v1/website/leads/financement`,
    {
      method: "POST",
      headers: {
        "X-Api-Key": process.env.CRM_API_KEY!,
        Accept: "application/json",
      },
      body: form,
    },
  );

  // 422 carries per-field messages; hand them back so the form can show them
  // against the field the applicant has to change.
  return Response.json(await response.json(), { status: response.status });
}
```

Do **not** set `Content-Type` yourself on a `FormData` body — `fetch` adds the
multipart boundary, and overriding it makes every file unreadable.

Booleans in multipart: send `"1"` / `"0"`, or `"true"` / `"false"`. Laravel's
`boolean` rule accepts both.

### Reading leads in the back office

```ts
const response = await fetch(
  `${process.env.CRM_API_URL}/v1/leads?status=nouveau&perPage=10`,
  {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  },
);

const { data, meta } = await response.json();
```

`data` maps onto the front end's `Lead` type as-is: the response keys are the
website's own field names. Two differences to expect:

- financing-only fields are **absent** on a Développement lead, not null — check
  `service` first;
- `documents`, `notes` and `activities` come back only from `GET /v1/leads/{id}`.
  The list gives `documentCount` and `noteCount`.

### Downloading a document

`downloadUrl` is an API route, not a public file URL — the disk is private, so a
plain `<a href>` from the browser gets a 401. Proxy it:

```ts
// src/app/api/documents/[id]/route.ts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const upstream = await fetch(
    `${process.env.CRM_API_URL}/v1/documents/${id}/download`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment",
    },
  });
}
```

### Error handling

| Status | Meaning | What to do |
|---|---|---|
| `401` | Bad or missing key/token | Re-authenticate. On `/website/*`, the key is wrong. |
| `429` on login | 5 failed attempts | Per login and IP. |
| `404` | No such record | |
| `422` | Validation or eligibility failure | Show `errors[field][0]` against that field. |
| `429` | Rate limited | Back off. Submissions allow 6/min per IP; logins 5 per login+IP. |

---

## 5. Design notes

Decisions worth knowing before extending this:

- **No `statuses`, `services` or `owners` tables.** Statuses and services are
  fixed values owned by the code that renders them; a lookup table would add a
  join and an admin screen for data nobody edits. And with a single
  administrator there is nobody to assign a lead to, so leads carry no owner at
  all.
- **One `leads` table for both services.** They share identity, company and
  tracking columns; the few that differ are nullable rather than a second table
  plus a join on every list query.
- **Amounts are stored twice** — verbatim as typed, and parsed into integer
  cents. The first is evidence, the second is what sorts and sums correctly.
- **Eligibility is frozen at submission** (`eligible_age`, `eligible_revenue`)
  *and* re-evaluated on read. Raising a threshold later must not retroactively
  reject a dossier accepted under the old one.
- **Submitted values are immutable over the API.** `PATCH /v1/leads/{id}` takes
  only `status`; what the applicant sent is evidence.
- **Documents never touch the public disk.** They are written through Laravel
  Storage to `lead_documents` (rooted at `storage/app/private/lead-documents`,
  no `url`, no public visibility) with a hashed filename, and a
  `lead_documents` row in MySQL ties each file to its lead by foreign key.
  Deleting a lead or a document removes the file with it. The only way to read
  one is the authenticated download endpoint.
- **Every mutation writes to `lead_activities`** through `Lead::recordActivity()`,
  and that table has no update or delete endpoint, so a dossier's history cannot
  be quietly rewritten.
- **Uploads are sniffed, not trusted.** The stored MIME type comes from the
  file's own bytes (`getMimeType()`), never the browser's `Content-Type`, which
  is set by whatever posted the form. Filenames are stripped to a safe basename
  before being stored or echoed back in a `Content-Disposition` header.
- **A rollback takes the files with it.** `DocumentStore` tracks what it wrote
  and discards it when the transaction fails, so a failed submission never
  leaves a bank statement on disk that no lead points to.
- **The reference is proposed, not guaranteed.** Two submissions can compute the
  same one; the unique index rejects the loser and the request retries. Read-then-write
  alone is a race.
- **`is_admin` is re-checked on every request** by the `admin` middleware, and a
  token whose account lost access is deleted on the spot. Checking only at login
  means revocation waits for the next sign-in, which is backwards.
- **`app/Support/Eligibility.php` is a deliberate port** of the website's
  `src/lib/eligibility.ts`, thresholds and edge cases included. If one side's
  numbers change, the other has to. Both live in this repository, so the two can
  be kept honest by a test.
