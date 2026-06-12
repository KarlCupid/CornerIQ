# delete-account

Trusted Edge Function for full in-app account deletion.

## Deploy

```bash
npm exec supabase -- functions deploy delete-account
```

Required function environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The service role key is only for the Edge Function runtime. It must never be placed in Expo/client code, tests, docs with real values, app config, screenshots, or QA artifacts.

## Request

```http
POST /functions/v1/delete-account
Authorization: Bearer <signed-in-user-jwt>
Content-Type: application/json

{ "confirmation": "DELETE ACCOUNT" }
```

## Success Response

```json
{
  "status": "deleted",
  "userId": "<caller-user-id>",
  "deletedAt": "2026-06-12T00:00:00.000Z",
  "signOutRequired": true,
  "appDataDeletion": {
    "athlete_profiles": { "status": "deleted", "count": 1 }
  }
}
```

## Failure Response

```json
{
  "status": "failed",
  "code": "invalid_token",
  "message": "Invalid or expired Authorization token."
}
```

## Security Boundary

- Request method must be `POST`.
- `Authorization: Bearer <user-jwt>` is required.
- The function verifies the JWT with Supabase Auth before deleting anything.
- The caller cannot provide a user id; the function derives it from the verified JWT.
- User-owned app rows are deleted by `user_id` in dependency-aware order.
- The Supabase Auth identity is deleted only for the verified caller.
- The client only calls `supabase.functions.invoke("delete-account")`; no trusted key is exposed to Expo/client runtime.

## Release Requirement

Apple submission requires this function to be deployed and smoke-tested against the production Supabase project before review credentials are provided in App Store Connect.
