/* NEXORA by AL – Service Worker nur für Benachrichtigungen (kein Zwischenspeicher, kein Offline-Betrieb). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = (e.notification.data && e.notification.data.url) || './index.html';
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) { if ('focus' in c) { try { c.postMessage({ nxGo: url }); } catch (x) { } return c.focus(); } }
        return self.clients.openWindow ? self.clients.openWindow(url) : null;
    }));
});
