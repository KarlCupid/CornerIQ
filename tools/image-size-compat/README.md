# Metro image-size compatibility

Expo SDK 54's Metro calls image-size with a Buffer in `getAssetSize`, and with a synchronous filename in `getAssetData`. image-size 2.x removed the filename API. This private build-tool adapter converts that filename to a Buffer and delegates all parsing to official `image-size@2.0.4`, pinned under the `image-size-patched` npm alias.

The root development dependency resolves the adapter relative to the repository, and the `$image-size` override reuses that resolved dependency for Metro consumers. A bare relative file override can resolve against the transitive parent's directory; do not replace the reference with that form. The adapter does not contain image parsers or copy older vulnerable code. It supports only the synchronous default/imageSize API used by this installed toolchain; it is not a general replacement for removed image-size 1.x callback or configuration APIs.

Remove the adapter after Expo's supported Metro line adopts its own fixed asset parser. An attempted global Metro 0.83.8 override exported native assets but broke Expo SDK 54's development watcher (`eventsQueue` changed), so that broader override was reverted.

`src/tests/tooling/dependencyCompatibility.test.ts` checks both Metro consumers with buffers and actual image filenames. Verify installation from the lockfile, full local browser QA, and a clean iOS export after changes. The adapter is local tooling and is not imported by app or engine code.
