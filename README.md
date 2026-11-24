# Camelot

Camelot is a Downtown Riverside dining and entertainment destination, with
separate customer, agent, and admin workspace previews.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Application structure

- `src/app/(public)` contains the public website: home, about, contact, and
  experiences.
- `src/app/(auth)` contains the login workspace selector and registration
  entry point.
- `src/app/(customer)`, `src/app/(agent)`, and `src/app/(admin)` contain the
  role-specific portal pages.
- `src/components/layout` contains shared site, portal, and page layouts.
- `src/modules` contains initial domain types for users, bookings, referrals,
  CMS content, and restaurant enquiries.
- `src/types` contains shared application types.

The route-group names in parentheses organize the code without appearing in
the URL. For example, `src/app/(customer)/customer/dashboard/page.tsx` maps to
`/customer/dashboard`.

## Authentication and data

The public homepage matches the current live Camelot design and uses its
concept assets. Reservations, event enquiries, and product sales are shown as
coming soon, consistent with the site's development status.

The app uses PostgreSQL through Prisma and Better Auth for email/password
authentication. Registration collects a name, email, optional phone number,
and optional avatar image URL. The first account created in an empty database
receives the admin role; later public registrations are customers. Agent roles
must be assigned to existing users by an administrator. Portal layouts check
the authenticated user's role before showing a workspace.

### Local database setup

1. In pgAdmin, create the `camelot_db` database owned by your local PostgreSQL
   user and make sure the PostgreSQL server is running.
2. Copy the template and edit it locally:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` to your local PostgreSQL username and password, and
   URL-encode special characters in the password. Do not commit or share `.env`.
3. Generate an auth secret with `openssl rand -base64 32` and set
   `BETTER_AUTH_SECRET` in `.env`. Keep `BETTER_AUTH_URL` as
   `http://localhost:3000` for local development. Configure `SMTP_HOST`,
   `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD` with your email provider's
   SMTP settings. Set `SMTP_FROM` to a sender address verified by that provider.
4. Apply the database migration:

   ```bash
   npm run db:migrate
   ```

5. Keep the app private and start it with `npm run dev`. Use `/register` to
   create the first admin account before making the app available to others.

To grant an existing account the agent role, use pgAdmin's Query Tool after
registration:

```sql
UPDATE "user"
SET role = 'agent'
WHERE email = 'your-admin-email@example.com'
RETURNING id, email, role;
```

Public registration cannot choose or change a role. Sign in at `/login`, choose
the appropriate workspace, and access will be checked against the role stored
in PostgreSQL.

### Managing accounts

Administrators can view and search the latest accounts at `/admin/users`, then
view a user's profile and edit their name, email, phone number, profile image,
or role. Profile images can be uploaded (PNG, JPEG, or WebP, up to 512 KB) or
provided as an image URL. Changing an email address marks it unverified so it
must be verified again.

Uploaded avatars for customer, agent, and admin accounts use the reusable
server-side image storage service. Local development uses the local provider by
default and stores files in `.data/user-images`; the directory is excluded from
version control. `USER_IMAGE_STORAGE_PROVIDER` defaults to `local`, so no
storage credentials are required. The optional `USER_IMAGE_STORAGE_DIR`
environment variable can point to a persistent local volume.

The image key is saved as a path in PostgreSQL through Prisma and images are
served by `/api/user-images/<filename>`. A future object-storage provider can
be added behind the same storage interface without changing account actions or
the image route. Deployments using local storage must attach a persistent,
writable volume at the storage directory.

When a user requests a password reset, an administrator can issue a temporary
password from the account directory, either automatically generated or entered
manually. The password is emailed to the address on the account, all sessions
are revoked, and the user must choose a new password after signing in. SMTP
must be configured before this workflow can be used. The administrator cannot
reset their own password through this workflow.

The portal pages still contain frontend previews; booking, referral, CMS, and
restaurant data services have not been implemented.

## Checks

```bash
npm run lint
npm run build
```
# camelot
# camelot
