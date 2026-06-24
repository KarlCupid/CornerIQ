# CornerIQ Privacy Policy Template

Published Privacy Policy URL: `https://sites.google.com/view/corneriq/privacy-policy`.

Published Support URL: `https://sites.google.com/view/corneriq/support`.

The app defaults point to these public URLs. `EXPO_PUBLIC_CORNERIQ_PRIVACY_POLICY_URL` and `EXPO_PUBLIC_CORNERIQ_SUPPORT_URL` can override them if the release owner moves the pages.

This template is for release-owner/legal review. Replace bracketed placeholders before publication.

## Overview

CornerIQ provides educational boxing performance planning support. The app is manual-first and does not require a wearable.

## Data CornerIQ Stores

- Account/auth data: Supabase Auth account identifiers, sign-in state, and related authentication records.
- Email or auth identifier: email address or provider identifier used to create and access the account.
- Athlete profile: boxing level, amateur/pro context, training age, stance if provided, equipment access, schedule availability, preferred units, and protected boxing sessions.
- Body and safety context: body mass, height, age, sex at birth if provided, pregnancy context if provided, medical restriction flags, eating or weight-cut risk flags, prior adverse weight-cut events, readiness, injury, illness, pain, hydration, sleep, stress, soreness, and safety stop flags.
- Nutrition, water, and electrolyte logs: manually entered calories, macronutrients, fiber, sodium, water, electrolyte, food status, and related confidence fields.
- Cycle data and symptoms: optional cycle tracking preference, cycle logs, symptoms, and symptom-aware context.
- Training plans and workout history: generated support workouts, fixed boxing sessions, protected schedule entries, workout completions, exercise results, weekly summaries, plan adjustments, training block history, and engine decision traces.
- Wearable/manual preference: whether the athlete prefers manual-only logging, may connect a wearable later, or is undecided. Wearable data is optional and used only when fresh and consistent.
- Subscription and purchase entitlement data: App Store subscription status, RevenueCat app user identifier, product identifiers, entitlement status, purchase/renewal/expiration status, and restore-purchase results. Do not include full payment card details; payment is handled by Apple.
- Exports/deletions: export previews, portable export bundle contents, app-data deletion actions, and account deletion requests handled through the server-side account deletion function.

## How Data Is Used

CornerIQ uses the data above to provide boxing-specific performance planning, safety stops, readiness context, fuel context, support workout placement, and export/delete controls. Missing data is treated as unknown.

CornerIQ does not use the app to provide medical diagnosis, emergency support, fertility prediction, or a diet plan.

## Analytics

No external analytics package is connected in the MVP. If analytics are added later, this policy must be updated before release.

## Third-Party Processors

CornerIQ uses Supabase for authentication, database storage, Row Level Security, and Edge Functions. Supabase processes account and app data needed to operate the service.

CornerIQ uses RevenueCat to process subscription entitlement status and App Store purchase/restore events needed to unlock paid access. Apple handles App Store payment processing.

## Data Retention And Deletion

Users can export app-owned data from Profile > Data.

Users can delete app-owned rows from Profile > Data after previewing export counts and typing `DELETE`.

Users can delete the full account from Profile > Data by typing `DELETE ACCOUNT`. The app calls a server-side Supabase Edge Function that verifies the signed-in user, deletes user-owned app rows, deletes the Supabase Auth identity, and signs the user out.

Backups, logs, and processor retention may continue for limited operational periods according to the release owner's production retention policy: [insert retention policy].

## Contact

Support URL: `https://sites.google.com/view/corneriq/support`.

Do not include private emails, credentials, or secret values in this policy.
