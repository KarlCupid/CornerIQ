# Windows And iPhone Testing

This guide is for running CornerIQ from a Windows laptop on web and on a physical iPhone with Expo Go.

## Current Expo Go Target

As of May 24, 2026, CornerIQ is temporarily pinned to Expo SDK 54 for physical iPhone testing with the App Store version of Expo Go.

Expo SDK 55 and SDK 56 may require a newer Expo Go build than some iPhones can install from the App Store. Do not upgrade CornerIQ back to SDK 55 or SDK 56 just to follow the newest SDK unless you are also ready to use a compatible Expo Go beta, `eas go`, or a development build.

References:

- Expo create-project guidance: https://docs.expo.dev/get-started/create-a-project/
- Expo SDK list: https://expo.dev/sdk
- Expo Go App Store transition note: https://expo.dev/changelog/expo-go-and-app-store-may-2026

## Run Web On Windows

1. Open PowerShell or Command Prompt.
2. Go to the repo:

```powershell
cd C:\Users\karll\Documents\CornerIQ
```

3. Install packages:

```powershell
cmd /c npm install
```

4. Start the web app:

```powershell
cmd /c npm run web
```

5. Expo will print a local web URL. Open that URL in your browser.

Stop the server with `Ctrl+C` when you are done.

## Run On iPhone With Expo Go

1. Install Expo Go from the iOS App Store.
2. Make sure the Windows laptop and iPhone have internet access.
3. In the repo, start Expo with a tunnel:

```powershell
cd C:\Users\karll\Documents\CornerIQ
cmd /c npx expo start --tunnel
```

4. If Expo asks to install the tunnel helper, allow it.
5. Open the Camera app on the iPhone and scan the QR code, or open Expo Go and scan from inside Expo Go.

Use `--tunnel` first for Windows + iPhone testing because it avoids many local Wi-Fi, firewall, and router discovery issues. If tunnel is slow, you can try the default LAN mode later with:

```powershell
cmd /c npx expo start
```

## What "Newer Version Of Expo Go Required" Means

Expo Go includes a native runtime for specific Expo SDK versions. If the project targets a newer SDK than the Expo Go app installed on the phone, Expo Go cannot load it and will show a "newer version required" message.

That message does not mean CornerIQ's JavaScript is broken. It means the installed Expo Go native shell does not match the project's SDK.

For CornerIQ, the expected Expo SDK is SDK 54. If Expo Go still asks for a newer version:

1. Delete Expo Go from the iPhone and reinstall it from the App Store.
2. Restart Expo with a clean tunnel:

```powershell
cmd /c npx expo start --tunnel --clear
```

3. Scan the new QR code.
4. Confirm the terminal shows SDK 54 for CornerIQ.

## If Expo Go Cannot Support The Current SDK

Use the simplest compatible path first:

1. Keep or downgrade the project to the latest SDK supported by App Store Expo Go.
2. Run `cmd /c npx expo install --fix` after changing SDK versions so Expo-managed packages match.
3. Run the local checks before handing the app to testers:

```powershell
cmd /c npm run typecheck
cmd /c npm test
cmd /c npm run lint
cmd /c npm run quality
cmd /c npm run preflight:beta
```

If the app must stay on an SDK that App Store Expo Go does not support, Expo Go is no longer the right testing path. Use one of these instead:

- A compatible Expo Go beta or `eas go`, if Expo provides one for that SDK.
- A development build made with EAS Build. This can be done from Windows because EAS builds in the cloud, but iPhone installation generally requires Apple Developer Program access.

Do not create an EAS build just to fix local Expo Go testing unless Expo Go compatibility is impossible and the blocker is documented.
