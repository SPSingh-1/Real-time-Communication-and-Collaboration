/* eslint-env serviceworker */

// Install event
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installed");
  event.waitUntil(self.skipWaiting()); // use event
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker activated");
  event.waitUntil(self.clients.claim()); // use event
});

// Listen for push notifications
self.addEventListener("push", (event) => {
  console.log("📩 Push received:", event.data ? event.data.text() : "No payload");

  const data = event.data ? event.data.json() : {};

  const title = data.title || "New Notification";
  const options = {
    body: data.body || "You have a new message",
    icon: "/icon.png", // put an icon in /public/icon.png
    badge: "/badge.png", // optional
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 Notification clicked:", event.notification);
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow("/");
    })
  );
});
