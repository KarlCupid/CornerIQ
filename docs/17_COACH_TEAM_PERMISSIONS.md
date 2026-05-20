# Coach Team Permissions

## Relationship lifecycle

Coach/team access starts as a user-owned `athlete_coach_relationships` row. The athlete can request a pending relationship from the client, both participants can read relationships they are part of, and either participant can revoke. Active approval is server-side only.

## Pending request

The Expo client may create a pending row with `athlete_user_id`, `coach_user_id`, and conservative permissions. A pending row does not grant programming authority, does not reveal coach UI, and does not let the coach mutate training plans.

## Active approval

`supabase/functions/approve-coach-relationship/index.ts` is the trusted boundary. It requires an Authorization Bearer JWT, verifies the caller with Supabase Auth, loads the pending row with the service role inside the Edge Function only, and only activates when the caller is the `athlete_user_id`. Future admin approval must come from server-asserted policy, not a client request flag.

## Revoke

RLS allows participant revocation by updating status to `revoked`. Revoked relationships should remove coach/team access immediately in future UI and service checks.

## Client restrictions

Expo/client code must never read or embed the service role key. Client repositories can request pending rows, list participant-visible rows, revoke participant rows, and check active relationships. They cannot activate a relationship.

## Service role boundary

The service role may only be read from Edge Function environment variables. It is used to verify the JWT and update a pending relationship after the athlete caller is confirmed.

## RLS behavior

RLS permits participant reads, athlete-created pending inserts, and participant revocation only. Active status requires the trusted function because regular client update policy only permits `revoked`.

## Coach UI stays hidden

Coach UI remains hidden because the permission model is not product-complete. The app should not expose coach controls until active relationships, scoped permissions, audit logs, and athlete-facing consent copy are complete.

## Future team memberships

Future team support should add explicit memberships, roles, scoped permissions, invitation expiry, audit events, and separate coach/admin approval paths without weakening athlete consent or RLS.
