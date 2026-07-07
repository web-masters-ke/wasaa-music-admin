# Wasaa Music Admin — dev accounts & role matrix

## 10 admin roles + suggested seed credentials

Ask DevOps to seed these into the identity service. Any password ≥ 8 chars works — sample below.

| Role                 | Email                          | Password         | What they see |
|----------------------|--------------------------------|------------------|---------------|
| Super Admin          | super_admin@wasaa.dev          | `SuperAdmin@2026` | Everything, incl. delete-permanent + role assignment + config edit |
| Music Admin          | music_admin@wasaa.dev          | `MusicAdmin@2026` | Everything except super-admin-only actions |
| Admin                | admin@wasaa.dev                | `Admin@2026!!!!` | General moderation + catalog + artists + live-events + tickets |
| Finance Admin        | finance_admin@wasaa.dev        | `Finance@2026!!!` | Only Finance section (royalties, payouts, tips) + tickets + read-only elsewhere |
| Content Moderator    | content_moderator@wasaa.dev    | `Content@2026!!` | Moderation queue + appeal review + content reports only |
| Support Agent        | support_agent@wasaa.dev        | `Support@2026!!` | Users (read) + content reports (resolve/dismiss) only |
| Artist Manager       | artist_manager@wasaa.dev       | `ArtistM@2026!!` | Artists + Tracks + Albums (their labels' scope) |
| Label Manager        | label_manager@wasaa.dev        | `LabelM@2026!!!` | Same as Artist Manager, label-scoped |
| Compliance Officer   | compliance_officer@wasaa.dev   | `Compliance@2026` | Audit Log + Strikes Ledger (read-only) + Copy & Legal |
| Analytics Admin      | analytics_admin@wasaa.dev      | `Analytics@2026` | Reports + Ad Analytics only |

## Role → Sidebar & Route matrix

| Section / Route                | super | music | admin | finance | content_mod | support | artist_mgr | label_mgr | compliance | analytics |
|--------------------------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Overview**                   |   |   |   |   |   |   |   |   |   |   |
| `/` Dashboard                  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/reports` Reports             | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ |
| **Content & Catalog**          |   |   |   |   |   |   |   |   |   |   |
| `/tracks`                      | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | — | — |
| `/tracks/moderation`           | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — |
| `/tracks/[id]` — delete perm   | ✓ | — | — | — | — | — | — | — | — | — |
| `/albums`                      | ✓ | ✓ | ✓ | — | ✓ | — | ✓ | ✓ | — | — |
| `/playlists`                   | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| **Artists & Users**            |   |   |   |   |   |   |   |   |   |   |
| `/artists`                     | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | — | — |
| `/artists/verification`        | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| `/artists/strikes` (ledger)    | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — |
| `/artists/[id]` revoke-strike  | ✓ | — | — | — | — | — | — | — | — | — |
| `/users`                       | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| **Live Streaming**             |   |   |   |   |   |   |   |   |   |   |
| `/live-events`                 | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — |
| `/live-events/schedule`        | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — |
| `/tickets`                     | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| **Moderation**                 |   |   |   |   |   |   |   |   |   |   |
| `/moderation`                  | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — |
| `/moderation/appeals`          | ✓ | ✓ | ✓ | — | ✓ | — | — | — | — | — |
| `/moderation/reports`          | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | — | — |
| **Finance**                    |   |   |   |   |   |   |   |   |   |   |
| `/finance/royalties`           | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| `/finance/payouts`             | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| `/finance/tips`                | ✓ | ✓ | — | ✓ | — | — | — | — | — | — |
| **Ads & Growth**               |   |   |   |   |   |   |   |   |   |   |
| `/ads/campaigns`               | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| `/ads/analytics`               | ✓ | ✓ | ✓ | — | — | — | — | — | — | ✓ |
| **CMS**                        |   |   |   |   |   |   |   |   |   |   |
| `/cms/featured`                | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| `/cms/banners`                 | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| `/cms/trending`                | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| `/cms/genres`                  | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |
| `/cms/legal`                   | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — |
| **System**                     |   |   |   |   |   |   |   |   |   |   |
| `/system/audit`                | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ | — |
| `/system/config` (write)       | ✓ | — | — | — | — | — | — | — | — | — |
| `/system/roles` (assign)       | ✓ | — | — | — | — | — | — | — | — | — |
| `/system/health`               | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |

`super_admin` bypasses all gates via `hasRole()` in `lib/auth.tsx`.

## Local testing WITHOUT waiting for DevOps

Mint HS256-signed JWTs locally that the music-service backend accepts:

```bash
cd wasaa-music-admin
JWT_SECRET=<same-secret-music-service-uses> node scripts/mint-dev-tokens.js
```

The script prints one token per role plus a paste-and-go DevTools snippet.

1. Copy the snippet for the role you want to test.
2. Open the music admin in your browser (`http://localhost:4003`).
3. Open DevTools console, paste the snippet, hit enter — you're in.

Backend `/admin/*` calls will be accepted (signature is valid), so you can actually exercise every gated action end-to-end.

## For prod: seed identity accounts

Hand DevOps the table at the top. For each row:

```sql
INSERT INTO users (id, email, password_hash, first_name, last_name, is_admin, role)
VALUES (
  gen_random_uuid(),
  'super_admin@wasaa.dev',
  crypt('SuperAdmin@2026', gen_salt('bf')),
  'Super', 'Admin', true, 'super_admin'
);
```

Or whatever the identity service's admin-create endpoint expects. The important claim on the JWT is `role: '<role>'` — that's what the music-service middleware reads.
