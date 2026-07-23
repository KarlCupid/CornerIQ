# Production Dependency Advisory Review - 2026-07-23

## Decision

The candidate has no high- or critical-severity production dependency finding at the enforced audit threshold. The high PostCSS advisory is remediated. Ten moderate notices remain in an Expo native build-tool chain and are accepted for this candidate with a controlled Expo SDK upgrade follow-up.

## Evidence

- `npm audit --audit-level=high --omit=dev` exits 0.
- `npm ls postcss uuid expo-asset --all` resolves `postcss@8.5.12`, `uuid@7.0.3` under `xcode@3.0.1`, and direct `expo-asset@12.0.13`.
- `npx expo-doctor` passes 18/18 checks.
- Typecheck, lint, 915 automated tests, quality, beta preflight, and coverage pass locally.

## Reviewed advisories

### PostCSS parser denial of service - high

- Advisory: `GHSA-6g55-p6wh-862q` / `CVE-2026-45623`.
- Exposure: Expo Metro and Vite process project CSS during development/build. The mobile app does not accept arbitrary user CSS, but the affected parser was still inside the production dependency tree.
- Resolution: root override to `postcss@8.5.12`, the patched release. This also clears the earlier moderate PostCSS line-return/XSS notice fixed in `8.5.10`.
- Status: fixed and verified by dependency resolution plus the high-threshold audit.

### UUID buffer bounds - 10 moderate dependency paths

- Advisory: `GHSA-w5hq-g745-h8pq`.
- Root package: `uuid@7.0.3`, required by `xcode@3.0.1`, which is required by Expo config/prebuild packages. npm reports ten paths to the same root advisory; these are not ten independent vulnerable implementations.
- Exposure: the issue applies to UUID v3/v5/v6 calls when a caller supplies an output buffer. CornerIQ does not call this transitive package from application runtime code; it is present in the native project-generation toolchain.
- Automatic-fix risk: npm proposes a breaking Expo change rather than a compatible same-major UUID update. Overriding `uuid` to a new incompatible major under `xcode` would make the native candidate less reliable without demonstrating that `xcode@3.0.1` supports that API.
- Status: accepted launch limitation for this non-production preview candidate. Track removal through a tested Expo SDK/config-plugin upgrade; do not use `npm audit fix --force` on the release branch.

## Follow-up

Re-run this review when Expo's supported config-plugin chain adopts a patched UUID release. The upgrade must include Expo Doctor, native iOS/Android builds, the full unit/coverage suite, and the browser QA bundle before acceptance.
