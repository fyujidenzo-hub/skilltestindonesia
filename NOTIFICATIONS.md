# Notification system

The customer and admin bells share `src/components/NotificationBell.tsx`. They watch the account's Firestore orders and transactions in real time; admin bells also watch registrations. `src/services/notificationEvents.ts` turns those business records into stable notification events and applies the current admin's scope.

The panel has unread and all views, an unread badge, links to the relevant page or admin tab, mark-read actions, and clear actions. Read and clear markers are saved under `notificationStates/{firebaseAuthUid}/items/{eventId}`. The Firestore rules allow only the authenticated owner to read or write those markers. When Firebase is not configured, the same markers are saved in local storage for development.

The inbox is derived from existing business records, so it can display pre-existing activity without a migration. Each account sees up to 100 recent events. Source records that are deleted can no longer appear in the inbox. Some older records have no timestamp for a status change, so their decision notification uses the record's creation time.

Closed-site alerts use Firebase Cloud Messaging. A user enables them from the bell; the browser registers `public/sw.js`, and the server stores the account's FCM device token in a server-only Firestore collection. `push-notifications.js` watches business records, deduplicates alert events, and sends only a generic "new notification" message. Order, account, and payment details remain inside the signed-in inbox. Sign-out removes the current device token.

The current Firebase project's Web Push public key is configured in the local build environment and as a project-specific fallback in `src/services/pushNotifications.ts`; `VITE_FIREBASE_VAPID_KEY` can override it after key rotation. Ensure the FCM Registration API is enabled for the Firebase project. Serve the site over HTTPS and keep the Node server running to watch Firestore changes. The push listener catches new records created shortly before server startup, but status changes that happen while the server is offline still appear only in the inbox. On supported iPhones, Web Push requires opening the site as a Home Screen app.

Deploy `firestore.rules` with the application before using the new inbox against production Firestore. The device token and push deduplication collections are server-only under the existing deny-all fallback rule.

## Deploying to testskillindonesia.com on Rumahweb

The GitHub repository is `fyujidenzo-hub/skilltestindonesia`. In cPanel, its clone is at `/home/tesm6325/repositories/skilltestindonesia`. After pushing a commit to GitHub, use **Update from Remote** in cPanel Git Version Control, then **Deploy HEAD Commit**. The checked-in `.cpanel.yml` runs `scripts/cpanel-deploy.sh`, which installs the locked dependencies, builds `dist/`, and touches Passenger's `tmp/restart.txt`. The cPanel checkout must be clean before deployment. A GitHub push alone does not update the live site.

Configure **Setup Node.js App** with Node.js 22 or newer, Application Root `/home/tesm6325/repositories/skilltestindonesia`, Application URL `https://testskillindonesia.com/`, and startup file `server.js`. The Express server serves both the built React site and the API, and runs the Firestore watcher that sends closed-site notifications. Publishing only `dist/` as static files cannot run that watcher or the API. If the app root or Node version in Rumahweb differs, adjust the cPanel application settings before deploying. The deployment task needs `node` and `npm` available on its `PATH`.

The local `trainingtestindonesia-deploy.zip` remains an alternative manual upload package: it contains the source, a prebuilt `dist/`, and the public browser configuration in `.env.production`. It excludes `.env`, `.env.local`, `node_modules/`, and Firebase Admin service-account JSON. Keep Firebase Admin credentials in Rumahweb's private application environment, outside the public web directory.

In Firebase Console for project `skilltestindonesia-36a6f`, add `testskillindonesia.com` to Authentication > Settings > Authorized domains. Add `www.testskillindonesia.com` only if that address will also serve the app. Confirm that the FCM Registration API is enabled and the Web Push certificate matches the configured public VAPID key. Publish `firestore.rules` and `storage.rules` with an authenticated Firebase CLI session or the Firebase Console; copying these files to Rumahweb does not publish the rules.

After deployment, check `https://testskillindonesia.com/sw.js` and `https://testskillindonesia.com/manifest.webmanifest`: each must return its own file, not the HTML fallback. Check `https://testskillindonesia.com/api/health` for `firebaseAdminReady: true`. Log in, enable device alerts at the bell, then close the site and create a new notification event from another account to confirm delivery. Redirect `www` to the primary domain if it is not intended as a separate user-facing address, so browser subscriptions remain on one origin. Browser permission and device support still govern delivery.

## Local verification

- `npm run build` checks TypeScript and produces the production bundle.
- `npm audit` and a separate clean `npm ci --omit=dev` check report zero known vulnerabilities for this lockfile as of 28 October 2026. Firebase's Node-side Firestore package requests an older gRPC version, so `package.json` overrides only that transitive package to patched `@grpc/grpc-js` 1.14.6; the Firebase rules emulator verifies the combination.
- `npm run test:notifications` simulates order changes and verifies that only the intended devices receive generic push payloads.
- `npm run test:rules` checks Firestore and Storage rules with the Firebase emulators. It requires Java 21 or newer; this workspace was checked with JDK 27.
- The built site, service worker, and manifest were served successfully from both Vite preview and the Express server on local loopback.

Actual delivery to a phone or browser still needs an HTTPS deployment, Firebase Admin credentials supplied to the Node server as a host secret, the updated Firestore rules, and a user who grants notification permission. Do not publish the local Firebase service account JSON file with static site assets.

On this Windows machine, Java 8 remains earlier on the system `PATH`. To rerun the emulator test from a PowerShell session, select the installed user JDK first:

```powershell
$env:JAVA_HOME = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
npm run test:rules
```
