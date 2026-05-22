# First Browser Test Findings

Date: 2026-05-21

Environment:

- Windows computer
- Chrome browser web test
- Commit tested: `d459a26` (`Align Expo SDK 55 for iPhone Expo Go`)

## Summary

The app launched, auth mostly worked, and onboarding could be completed. The tester stopped at Today because the first-time experience did not explain what to enter or what to do next.

## Findings

- Onboarding Step 1 showed an unlabeled training-age field under Boxing identity.
- Body mass fields did not clearly explain units, examples, or why each value matters.
- Training access asked for free-text strings without showing acceptable values.
- Protected boxing anchors felt like one-off dated events instead of recurring weekly commitments.
- Cycle and safety fields were ambiguous; pregnancy-specific choices appeared even when male was selected.
- Goal-phase fields did not explain the goal choices or why fight/tournament details were needed.
- Auth used one credential form with separate sign-in/sign-up buttons, which made sign-up feel unclear.
- Today did not give a first action; tester note: "Literally no clue."
- Today showed too much engine detail before basic guidance.
- Quick logs use a 1-5 scale, but the test script expected 1-10.

## Product Response In This Pass

- Keep the engine-owned behavior and existing Supabase schema.
- Add visible labels, helper copy, examples, and chip presets to onboarding.
- Keep body-mass entry metric for this beta while making the display-unit choice explicit.
- Make protected anchors read as recurring weekly commitments and map them to current-week dates internally.
- Hide pregnancy-specific safety choices for male sex-at-birth selection with plain explanatory copy.
- Add a Today Start here card and move detailed engine rationale lower.
- Keep quick logs at 1-5 and explain the scale next to readiness inputs.

## Follow-Up

Rerun the first-time browser test from sign-up through Today after this pass lands, then validate the same flow on a phone-sized viewport and physical device.
