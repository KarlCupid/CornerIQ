# approve-coach-relationship

Trusted Edge Function for activating a pending athlete-coach relationship after athlete consent.

## Deploy

```bash
npm exec supabase -- functions deploy approve-coach-relationship
```

Required function environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The service role key is only for the Edge Function runtime. It must never be placed in Expo/client code, tests, docs with real values, or app config.

## Local Smoke

```bash
npm exec supabase -- functions serve approve-coach-relationship
```

Then call the local function with a real athlete Bearer JWT and a pending relationship id. Do not use the service role key as the caller token.

## Security Boundary

- Request method must be `POST`.
- `Authorization: Bearer <athlete-jwt>` is required.
- Payload must include `relationshipId`.
- Optional `permissions` must be an object of boolean values.
- Supported permission keys are `view_training_plan`, `view_readiness_context`, `comment_on_plan`, and `suggest_adjustments`.
- The function verifies the JWT with Supabase Auth.
- The function loads a pending `athlete_coach_relationships` row with the service role inside the function only.
- Only the row's `athlete_user_id` can approve the pending relationship.
- Active coach authority requires athlete consent and a pending row; the client cannot self-activate a relationship.

## Revocation

Participants can revoke through RLS by setting relationship status to `revoked`. Future coach/team UI and services must treat `revoked` as immediate loss of authority.

## Known Limitations

- Production audit events for approval/revocation are still required before public coach UI.
- Athlete-facing consent copy is still required.
- Team/admin policies are still deferred.
- Coach UI remains hidden.
