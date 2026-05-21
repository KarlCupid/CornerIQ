# Codex Last Handoff

Date: 2026-05-21 15:49 America/Vancouver

Pass: Expo Go compatibility audit for Windows laptop + physical iPhone testing.

Current branch during this pass: `main`

Commit created in this run: none.

## Summary

This was an Expo setup and verification pass only. No product features were added, no Supabase runtime logic was changed, no secret values were committed, and no EAS build was created.

CornerIQ was already on Expo SDK 55, which is the current physical iOS Expo Go target recommended by Expo during the SDK 56 transition. I did not downgrade to SDK 54 and did not upgrade to SDK 56. Instead, I aligned the SDK 55 package patch version, removed an SDK 55-invalid app config field, added Windows/iPhone testing docs, and verified the app on web plus the required quality gates.

## SDK Decision

- SDK version before: Expo SDK 55 (`expo` declared as `^55.0.25`, lockfile resolved `55.0.25`).
- SDK version after: Expo SDK 55 (`expo` declared as `~55.0.26`, lockfile resolved `55.0.26`).
- Latest physical iOS Expo Go target found: SDK 55 for App Store Expo Go during the SDK 56 transition.
- Expo Go should now work: yes, if the iPhone has an Expo Go build that supports SDK 55.
- Remaining blocker: if the user's App Store still only provides an Expo Go build that supports SDK 54, the blocker is Expo Go availability on that device/App Store account, not CornerIQ package alignment. Reinstall Expo Go, retry `npx expo start --tunnel --clear`, and if the device still cannot get SDK 55 Expo Go, use a compatible Expo Go beta/`eas go` or an EAS development build path.

References checked:

- https://docs.expo.dev/get-started/create-a-project/
- https://expo.dev/sdk
- https://expo.dev/changelog/expo-go-and-app-store-may-2026
- https://expo.dev/changelog/sdk-55

## Changes Made

- Updated `expo` from `^55.0.25` to `~55.0.26` using Expo CLI.
- Updated `package-lock.json` from the Expo-managed install.
- Removed `expo.newArchEnabled` from `app.json`; Expo Doctor rejected it as an additional property under SDK 55.
- Added `docs/WINDOWS_IPHONE_TESTING.md` with beginner-friendly Windows web and iPhone Expo Go instructions, including tunnel mode and the "newer version of Expo Go required" explanation.
- Rewrote this handoff with before/after SDK state, commands, verification, and remaining blocker.

## Verification Results

- `cmd /c npm install`: passed.
- `cmd /c npm run web`: passed; Expo started Metro and served web at `http://localhost:8081`.
- `Invoke-WebRequest -UseBasicParsing http://localhost:8081 | Select-Object -ExpandProperty StatusCode`: returned `200`; server was then stopped with `Ctrl+C`.
- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: sandboxed run failed before loading Vitest config due Windows/esbuild access denied; approved rerun outside the sandbox passed with `366` tests passed and `1` skipped.
- `cmd /c npm run lint`: passed.
- `cmd /c npm run quality`: approved run outside the sandbox passed; it ran typecheck and tests with `366` tests passed and `1` skipped.
- `cmd /c npm run preflight:beta`: passed.
- `cmd /c npx expo install --check`: initially found `expo@55.0.25` should be `~55.0.26`; after `--fix`, passed.
- `cmd /c npx expo-doctor`: initially failed on `app.json` schema because of `newArchEnabled`; after removing it, passed `19/19` checks.
- `cmd /c npx expo config --type public`: resolved `sdkVersion: '55.0.0'` and platforms `ios`, `android`, `web`.

## Exact Commands Run

```powershell
pwd
rg --files -g package.json -g package-lock.json -g app.json -g app.config.* -g babel.config.* -g metro.config.* -g eas.json -g docs/WINDOWS_IPHONE_TESTING.md -g docs/CODEX_LAST_HANDOFF.md
git status --short
Get-Content -Raw package.json
Get-Content -Raw app.json
Get-Content -Raw babel.config.js
Get-Content -Raw eas.json
rg -n '"(expo|react-native|react|@expo|expo-|metro|babel-preset-expo|react-native-web|@react-native|jest-expo)"|expo' package-lock.json
rg --files -g '*.ts' -g '*.tsx' -g '*.js' -g '*.jsx' -g '!node_modules'
Get-Content -Raw docs\CODEX_LAST_HANDOFF.md
Test-Path docs\WINDOWS_IPHONE_TESTING.md
cmd /c npx expo install --check
cmd /c npx expo install --fix
cmd /c npx expo install --check
cmd /c npx expo config --type public
cmd /c npx expo-doctor
Get-Content -Raw src\tests\docs\betaReleaseOperations.test.ts
Get-Content -Raw src\tests\docs\betaReleaseCandidateChecklist.test.ts
Get-Content -Raw src\tests\static\betaReleaseConfigStatic.test.ts
Get-Content -Raw scripts\beta-preflight.mjs
Get-ChildItem docs | Select-Object -ExpandProperty Name
cmd /c npm install
cmd /c npm run web
Invoke-WebRequest -UseBasicParsing http://localhost:8081 | Select-Object -ExpandProperty StatusCode
cmd /c npm run typecheck
cmd /c npm test
cmd /c npm run lint
cmd /c npm run preflight:beta
cmd /c npm run quality
git diff -- package.json app.json docs\WINDOWS_IPHONE_TESTING.md docs\CODEX_LAST_HANDOFF.md
git diff --stat
cmd /c npx expo config --type public
```

Notes:

- The first sandboxed `cmd /c npx expo install --check` failed with a network/access aggregate error and was rerun with approval.
- The first `cmd /c npx expo-doctor` failed as expected before the `app.json` fix, then passed after the fix.
- The sandboxed `cmd /c npm test` failed with the known Windows/esbuild access denied issue, then passed outside the sandbox.

## Next iPhone Steps

From Windows:

```powershell
cd C:\Users\karll\Documents\CornerIQ
cmd /c npx expo start --tunnel --clear
```

Then scan the QR code with the iPhone Camera app or Expo Go. If the same "newer version of Expo Go required" message appears after reinstalling Expo Go, the iPhone does not currently have SDK 55-capable Expo Go available; use the alternatives documented in `docs/WINDOWS_IPHONE_TESTING.md`.
