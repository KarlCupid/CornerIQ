# Apple Subscription Setup

Date: 2026-06-24

CornerIQ uses App Store in-app purchase for paid access after account sign-in and onboarding. Product features are gated after onboarding; account, privacy, support, export, sign-out, restore purchase, and delete-account controls remain available without a subscription.

## Pricing Decision

- Monthly: `CA$15/month`
- Annual: `CA$100/year`
- Free trial: none
- Subscription group suggestion: `CornerIQ Access`
- RevenueCat entitlement id: `corneriq_pro`
- Monthly product id: `com.corneriq.pro.monthly`
- Annual product id: `com.corneriq.pro.annual`

Use these product IDs in App Store Connect and RevenueCat unless the release owner intentionally changes the public env overrides.

## App Runtime Env

Public Expo variables:

- `EXPO_PUBLIC_CORNERIQ_PAYWALL_ENABLED=1`
- `EXPO_PUBLIC_CORNERIQ_REVENUECAT_IOS_API_KEY=<RevenueCat public iOS SDK key>`
- `EXPO_PUBLIC_CORNERIQ_REVENUECAT_ENTITLEMENT_ID=corneriq_pro`
- `EXPO_PUBLIC_CORNERIQ_MONTHLY_PRODUCT_ID=com.corneriq.pro.monthly`
- `EXPO_PUBLIC_CORNERIQ_ANNUAL_PRODUCT_ID=com.corneriq.pro.annual`

Android is not the current App Store submission path, but the app also declares `EXPO_PUBLIC_CORNERIQ_REVENUECAT_ANDROID_API_KEY` for a future Play build.

## Release Owner Apple Tasks

1. Enroll in the Apple Developer Program as the intended seller.
2. Complete Apple account identity checks and enable two-factor authentication.
3. In App Store Connect, accept the Paid Apps Agreement and complete tax and banking.
4. Create the App Store Connect app record for bundle id `com.corneriq.app`.
5. Create subscription group `CornerIQ Access`.
6. Create auto-renewable subscriptions:
   - `com.corneriq.pro.monthly`, one month, Canada price `CA$15`.
   - `com.corneriq.pro.annual`, one year, Canada price `CA$100`.
7. Add subscription localization, review screenshot, description, and availability.
8. Create a RevenueCat project and iOS app using bundle id `com.corneriq.app`.
9. Connect RevenueCat to App Store Connect, add the two products, attach them to entitlement `corneriq_pro`, and place them in the default offering.
10. Set `EXPO_PUBLIC_CORNERIQ_REVENUECAT_IOS_API_KEY` for the production EAS/App Store build.
11. Build a development or TestFlight build and verify purchase, restore, cancel/error, and delete-account access.
12. Before App Store submission, run:

```powershell
CORNERIQ_APPLE_SUBMISSION=1 cmd /c npm run preflight:production
```

## App Review Notes Addition

Add to the existing review notes:

```text
CornerIQ uses auto-renewable in-app purchase subscriptions after onboarding.

Subscriptions:
- Monthly: CA$15/month
- Annual: CA$100/year
- No free trial

Users can create/sign in to an account and complete onboarding without purchase. After onboarding, app product features require subscription. Restore purchase, Privacy Policy, Support, sign out, export, and delete account remain available from the paywall without purchase.
```
