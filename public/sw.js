self.addEventListener("push", (event) => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        self.registration.showNotification(data.title || "JMR Alert", {
            body: data.body || "New update",
            icon: "/assets/jmr.png",
            badge: "/assets/jmr.png", // Often good to have a badge too
            data: data.url || "/", // Store URL to open on click
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url && "focus" in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                const urlToOpen = event.notification.data || "/";
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
