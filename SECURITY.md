# Security

## Deployment defaults

VIDYA listens on `127.0.0.1` by default. Docker listens on all interfaces only
inside the container and publishes the service to host loopback. Complete the
initial administrator setup before explicitly enabling LAN access.

Browser requests must be same-origin unless their origins are listed in
`CORS_ALLOWED_ORIGINS`. API clients without an `Origin` header remain
supported. Authentication tokens are accepted only through the
`Authorization: Bearer` header and must not be placed in URLs.

Set `SESSION_COOKIE_SECURE=true` when VIDYA is served over HTTPS. The generated
session and JWT secrets are stored in `keys.json` under `VIDYA_DATA_PATH`.

## Dependency audit

The dependency audit currently reports moderate upstream advisories:

- Sequelize includes `uuid@8`. Its vulnerable UUID v3, v5, and v6 buffer APIs
  are not called by VIDYA or Sequelize; the runtime uses UUID v1 and v4 without
  caller-provided buffers. npm's suggested Sequelize 3.x downgrade is unsafe.
- React Router 6 has open-redirect advisories. VIDYA uses its client-only
  browser router with application-defined destinations. Newer React Router
  releases currently introduce high-severity RSC/SSR advisories for features
  this application does not use, so the v6 line remains pinned pending an
  upstream release without that regression.

CI fails on high or critical advisories while these moderate upstream issues
are tracked.

## Windows tray application

The source for the checked-in Windows tray binaries is not present in this
repository. The installer no longer runs them elevated, but their provenance
cannot be established here. Treat replacement with reproducibly built,
source-linked artifacts as a separate required hardening task.
