/* Generic account alerts. Detailed records remain inside the signed-in inbox. */
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try { payload = event.data?.json() || {}; } catch { /* Keep the generic alert. */ }
    const data = payload.data || payload;
    const path = data.path === "/admin" ? "/admin" : "/";
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: "ACCOUNT_NOTIFICATION" }));
    await self.registration.showNotification("Tokopedia", {
      body: "Anda memiliki notifikasi baru. Buka aplikasi untuk melihatnya.",
      icon: "/assets/customer-logo.jpeg",
      badge: "/assets/customer-logo.jpeg",
      tag: "tokopedia-account-update",
      data: { path },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.path === "/admin" ? "/admin" : "/";
  const destination = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(destination);
        return client.focus();
      }
    }
    return self.clients.openWindow(destination);
  })());
});
