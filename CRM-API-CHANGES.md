# Sansekai CRM — API change notice

**31 August 2026** · commit `712b1efe` on `admin-dashboard-backend`,
`6afc8e6e` on `admin-dashboard-front`

Two changes to the contract between the website and the Laravel CRM, plus a
password change that now actually works.

| Where | State | Note |
|---|---|---|
| GitHub | **Pushed** | Both branches carry the change and are content-identical. |
| Hostinger VPS | **Not deployed** | `api.sansekai.72-60-190-211.sslip.io` still expects the old `login` field. |
| Back office | **Blocked until deploy** | The new front end sends `email`. Sign-in fails against the current server. |

---

## 1. Sign in with an email address

The administrator account had two identifiers — a username and an email — and
`POST /v1/auth/token` accepted either one in a field called `login`. That meant
two credentials to hand over at installation and two that could drift apart, for
a `username` column whose only job was to hold the string `admin`.

The email is now the only login. It is what the Filament panel already signed in
with, so there is one credential instead of two. Matching is case-insensitive,
and the rate limit keys on the email plus the IP.

### `POST /api/v1/auth/token`

```jsonc
// before
{ "login": "admin", "password": "…", "deviceName": "back-office" }

// now
{ "email": "admin@sansekaisolution.com", "password": "…", "deviceName": "back-office" }
```

Validation errors move with the field. A wrong password and an unknown account
both return **422** with the same message under `errors.email` — a login
endpoint should not tell an attacker which half they got right. Five failed
attempts per email and IP returns **429**.

The `username` column is dropped by migration and is gone from the `AdminUser`
response object. Anything reading `user.username` from a token response needs
updating.

**Account:** `admin@sansekaisolution.com`. The starting password is whatever
`ADMIN_PASSWORD` holds in the server's `.env` — deliberately not written down
here, since this file is meant to be sent. Change it from the back office after
the first sign-in (section 3).

---

## 2. Documents: all optional, and one slot takes many

Three of the four upload slots on the financing form used to be mandatory: a
submission without a Kbis was refused outright. That loses the lead entirely over
paperwork that can be collected afterwards, so **every slot is now optional**.
Chasing the missing document is the back office's job, through
`POST /v1/leads/{lead}/documents`.

What replaces the required rule is a rule about how many files each slot holds:

| Field | Files | What it is |
|---|---|---|
| `pieceIdentite` | 1 | Pièce d'identité. |
| `kbis` | 1 | Kbis / justificatif d'immatriculation. |
| `relevesBancaires` | 1 | Relevé bancaire des 6 derniers mois. Six months arrives as one export, not six files — the form no longer offers "add another" here. |
| `documentsComptables[]` | up to 20 | Informations financières / comptables — bilan, compte de résultat, liasse fiscale. As many pieces as the dossier has. |

### Wire format

`documentsComptables` is an **array** now. Send it as repeated parts; the other
three stay single files.

```
# multipart/form-data → POST /api/v1/website/leads/financement
kbis                    = extrait-kbis.pdf
relevesBancaires        = releve-jan-juin.pdf
documentsComptables[]   = bilan.pdf
documentsComptables[]   = compte-resultat.pdf
documentsComptables[]   = liasse-fiscale.pdf
```

The cap of 20 is there so a single request cannot park an unbounded number of
10 MB files on the disk. Exceeding it is a **422** on `documentsComptables`.

### The same rule applies to admin uploads

Posting a second file into a single-file slot returns **422** on `kind`, and the
existing document has to be deleted first. That is deliberate: two Kbis on one
dossier, with nothing recording which is current, is worse than making the
replacement an explicit act. `comptable` and `autre` stack freely.

```jsonc
// POST /api/v1/leads/{lead}/documents
{
  "message": "Ce dossier a déjà un document « Kbis / justificatif d'immatriculation ».",
  "errors": {
    "kind": ["… Supprimez-le avant d'en ajouter un autre."]
  }
}
```

Accepted types and sizes are unchanged: PDF, JPG or PNG, capped at the smaller of
the app's 10 MB and PHP's own `upload_max_filesize`.

---

## 3. The admin can change their password

The back office had a "Changer le mot de passe" panel that validated its three
fields and then told the admin the feature was not connected. It now calls the
API.

### `PATCH /api/v1/auth/password`

```json
{
  "currentPassword": "…",
  "password": "…",
  "password_confirmation": "…"
}
```

The current password is required, so a stolen token on its own cannot lock the
owner out of their account. On success every *other* token is revoked and the one
making the call survives: if the password changed because it leaked, sessions
opened with the old one must not outlive it — but the admin doing the changing
should not be thrown out of the screen they are standing on.

Per-field errors come back under `currentPassword` and `password`, and the panel
shows each one against the field it belongs to. Minimum length is eight
characters.

---

## 4. Deploying to Hostinger

Until these steps run, the server keeps the old contract and the updated back
office cannot sign in. The order matters — the migration drops a column the old
code still reads.

**1. Pull the branch** — on the VPS, in the Laravel application directory.

```bash
git fetch origin
git checkout admin-dashboard-backend
git pull origin admin-dashboard-backend
```

**2. Set the admin account in `.env`.** `ADMIN_USERNAME` is gone; remove it and
confirm the email and password. `.env` is not in git, so this file is only ever
edited on the server.

```diff
- ADMIN_USERNAME=admin
  ADMIN_EMAIL=admin@sansekaisolution.com
  ADMIN_PASSWORD=<the password you want>
```

**3. Migrate and seed.** The migration drops the `username` column and its unique
index. Re-seeding updates the existing row rather than adding a second, and
resets the password to `ADMIN_PASSWORD`.

```bash
php artisan migrate --force
php artisan db:seed --class=AdminUserSeeder --force
```

**4. Rebuild the caches.** Required, not optional: a stale config cache keeps
serving the old admin settings, and a stale route cache keeps the old validation.

```bash
php artisan config:clear && php artisan config:cache
php artisan route:clear  && php artisan route:cache
php artisan view:clear
```

**5. Check it took.** The first call should now complain about `email`, not
`login`. That one word is the whole deployment test.

```bash
curl -s -X POST https://api.sansekai.72-60-190-211.sslip.io/api/v1/auth/token \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{}'

# expected: {"message":"The email field is required.", …}
```

**6. Point the back office at it.** Wherever the Next.js app runs, `CRM_API_URL`
must be set — over **https**. The host redirects plain HTTP, and a redirected
POST loses its body, which breaks sign-in with no useful error.

```dotenv
# .env.local — server-side only, no NEXT_PUBLIC_ prefix
CRM_API_URL=https://api.sansekai.72-60-190-211.sslip.io/api
```

---

## 5. Where the full spec lives

Everything above is one slice of the API. The complete contract — 21 endpoints,
every field, every error shape — is the OpenAPI spec at `backend/openapi.yaml`,
browsable as Swagger UI:

```
GET https://api.sansekai.72-60-190-211.sslip.io/api/docs
```

The spec and the integration guide at `backend/API.md` were both updated in the
same commit — they were the only written description of the old contract, so
leaving them behind would have left the wrong one in circulation. The Swagger
page shows the new request bodies as soon as the server is redeployed.
