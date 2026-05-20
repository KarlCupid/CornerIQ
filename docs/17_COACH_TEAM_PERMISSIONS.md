# Coach Team Permissions

## Relationship lifecycle

Coach/team access starts as a user-owned `athlete_coach_relationships` row. The athlete can request a pending relationship from the client, both participants can read relationships they are part of, and either participant can revoke. Active approval is server-side only.

States:
- `pending`: request exists, no coach authority.
- `active`: athlete approved through the trusted Edge Function.
- `revoked`: participant revoked; future services and UI must treat authority as removed immediately.

## Pending request

The Expo client may create a pending row with `athlete_user_id`, `coach_user_id`, and conservative permissions. A pending row does not grant programming authority, does not reveal coach UI, and does not let the coach mutate training plans.

## Active approval

`supabase/functions/approve-coach-relationship/index.ts` is the trusted boundary. It requires `POST`, an Authorization Bearer JWT, verifies the caller with Supabase Auth, loads the pending row with the service role inside the Edge Function only, and only activates when the caller is the row's `athlete_user_id`.

`supabase/functions/approve-coach-relationship/policy.ts` owns the pure helpers for:
- Bearer token parsing;
- payload validation;
- permission key validation;
- athlete-only pending relationship approval eligibility.

Future admin approval must come from server-asserted policy, not a client request flag.

## Deployment

Deploy:

```bash
npm exec supabase -- functions deploy approve-coach-relationship
```

Required Edge Function environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Local serve command:

```bash
npm exec supabase -- functions serve approve-coach-relationship
```

Local/manual testing should call the function with a real athlete Bearer JWT and a pending relationship id. Do not use the service role key as the caller token.

## Permission keys

Supported keys:
- `view_training_plan`: coach can view training plan context after active consent.
- `view_readiness_context`: coach can view readiness context after active consent.
- `comment_on_plan`: coach can leave plan comments after active consent and future UI support.
- `suggest_adjustments`: coach can suggest adjustments after active consent and future service policy.

All permission values must be boolean. Unsupported keys are rejected.

## Revoke

RLS allows participant revocation by updating status to `revoked`. Revoked relationships should remove coach/team access immediately in future UI and service checks.

## Client restrictions

Expo/client code must never read or embed the service role key. Client repositories can request pending rows, list participant-visible rows, revoke participant rows, and check active relationships. They cannot activate a relationship.

## Service role boundary

The service role may only be read from Edge Function environment variables. It is used to verify the JWT and update a pending relationship after the athlete caller is confirmed. It must never be written to app config, Expo source, tests, docs with real values, or Git history.

## RLS behavior

RLS permits participant reads, athlete-created pending inserts, and participant revocation only. Active status requires the trusted function because regular client update policy only permits `revoked`.

## Audit requirements before public coach UI

Before coach UI ships publicly, add:
- approval and revocation journey/audit events;
- deployed function smoke tests;
- admin/team policy if team accounts are introduced;
- athlete-facing consent copy that explains exactly what each permission allows;
- UI gates that hide coach controls unless the relationship is active and the required permission is true.

## Coach UI stays hidden

Coach UI remains hidden because the permission model is not product-complete. The app should not expose coach controls until active relationships, scoped permissions, audit logs, and athlete-facing consent copy are complete.

## Future team memberships

Future team support should add explicit memberships, roles, scoped permissions, invitation expiry, audit events, and separate coach/admin approval paths without weakening athlete consent or RLS.

## Current tests/static checks

Current tests prove:
- missing Bearer auth is rejected before trusted work;
- invalid payloads are rejected;
- unsupported permission keys are rejected;
- only the athlete caller can approve a pending row;
- service-role references are absent from Expo/client code;
- the client relationship repository cannot activate a relationship;
- coach UI and coach-only notes remain hidden.
