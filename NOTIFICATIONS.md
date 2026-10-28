# Notification system

The customer and admin bells share `src/components/NotificationBell.tsx`. They watch the account's Firestore orders and transactions in real time; admin bells also watch registrations. `src/services/notificationEvents.ts` turns those business records into stable notification events and applies the current admin's scope.

The panel has unread and all views, an unread badge, links to the relevant page or admin tab, mark-read actions, and clear actions. Read and clear markers are saved under `notificationStates/{firebaseAuthUid}/items/{eventId}`. The Firestore rules allow only the authenticated owner to read or write those markers. When Firebase is not configured, the same markers are saved in local storage for development.

The inbox is derived from existing business records, so it can display pre-existing activity without a migration. Each account sees up to 100 recent events. Source records that are deleted can no longer appear in the inbox. Some older records have no timestamp for a status change, so their decision notification uses the record's creation time.

Closed-site alerts use Firebase Cloud Messaging. A user enables them from the bell; the browser registers `public/sw.js`, and the server stores the account's FCM device token in a server-only Firestore collection. `push-notifications.js` watches business records, deduplicates alert events, and sends only a generic "new notification" message. Order, account, and payment details remain inside the signed-in inbox. Sign-out removes the current device token.

The current Firebase project's Web Push public key is configured in the local build environment and as a project-specific fallback in `src/services/pushNotifications.ts`; `VITE_FIREBASE_VAPID_KEY` can override it after key rotation. Ensure the FCM Registration API is enabled for the Firebase project. Serve the site over HTTPS and keep the Node server running to watch Firestore changes. The push listener catches new records created shortly before server startup, but status changes that happen while the server is offline still appear only in the inbox. On supported iPhones, Web Push requires opening the site as a Home Screen app.

Deploy `firestore.rules` with the application before using the new inbox against production Firestore. The device token and push deduplication collections are server-only under the existing deny-all fallback rule.

## Deploying to testkemitraanindonesia.com on Hostinger

Upload `trainingtestindonesia-deploy.zip` as a **Node.js web app** in Hostinger, using Node.js 22 or newer and `server.js` as the startup file. The ZIP contains source and prebuilt `dist/`, but excludes `.env` files, `node_modules/`, and Firebase Admin service-account JSON. Configure the Firebase Admin credentials privately in Hostinger's application environment. The Express server serves both the React site and `/api` routes. Closed-site push alerts also depend on a continuously running Firestore watcher; verify that the chosen hosting plan supports that process, or run the watcher on a persistent service.

In Hostinger, connect `testkemitraanindonesia.com` to the Node.js app. Point the domain's nameservers or A record to Hostinger as instructed in its dashboard, then wait for DNS and SSL to finish. Use the apex domain as the primary address and redirect `www` to it if `www` is enabled. The domain may remain registered at Rumahweb while Hostinger serves the site.

## Existing Rumahweb Git checkout

The GitHub repository is `fyujidenzo-hub/skilltestindonesia`. In cPanel, its current clone is at `/home/tesm6325/repositories/skilltestindonesia2`. After pushing a commit to GitHub, use **Update from Remote** in cPanel Git Version Control, then **Deploy HEAD Commit**. The checked-in `.cpanel.yml` runs `scripts/cpanel-deploy.sh`, which extracts the tested prebuilt `dist/` from the tracked deployment ZIP, installs runtime dependencies if Node.js 22+ is available to the Git task, and touches Passenger's `tmp/restart.txt`. The cPanel checkout must be clean before deployment. Git deployment prepares the files but does not create or configure a Node.js app.

The Rumahweb Entry plan used for this checkout does not offer **Setup Node.js App**. If the plan is upgraded to one with Node.js 22 or newer, use Application Root `/home/tesm6325/repositories/skilltestindonesia2`, Application URL `https://testkemitraanindonesia.com/`, and startup file `server.js`. Run **NPM Install** if the Git deployment skipped npm, then restart the app. Publishing only `dist/` as static files cannot run the API or push watcher.

The local `trainingtestindonesia-deploy.zip` also supplies the prebuilt `dist/` used by Git deployment. A rebuild on any host needs the public Firebase build variables through its environment or a private `.env.production` file. Keep Firebase Admin credentials private and outside the public web directory.

In Firebase Console for project `skilltestindonesia-36a6f`, add `testkemitraanindonesia.com` to Authentication > Settings > Authorized domains. Add `www.testkemitraanindonesia.com` only if that address will also serve the app. Confirm that the FCM Registration API is enabled and the Web Push certificate matches the configured public VAPID key. Publish `firestore.rules` and `storage.rules` with an authenticated Firebase CLI session or the Firebase Console; copying these files to a host does not publish the rules.

After deployment, check `https://testkemitraanindonesia.com/sw.js` and `https://testkemitraanindonesia.com/manifest.webmanifest`: each must return its own file, not the HTML fallback. Check `https://testkemitraanindonesia.com/api/health` for `firebaseAdminReady: true`. Log in, enable device alerts at the bell, then close the site and create a new notification event from another account to confirm delivery. Browser permission and device support still govern delivery.

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
