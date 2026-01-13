// Service Worker for TaskFlow PWA
// Handles offline functionality, caching, and background sync

const CACHE_VERSION = "v1";
const CACHE_NAME = `taskflow-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/robots.txt",
];

// Install event - cache essential files
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static assets...");
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn("[SW] Failed to cache some assets:", err);
        });
      })
      .then(() => {
        console.log("[SW] Service worker installed");
        return self.skipWaiting();
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      }),
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - network first with timeout
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      Promise.race([
        fetch(request),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 5000),
        ),
      ]).catch(() => {
        // Return offline response if network fails
        return new Response(
          JSON.stringify({
            error: "Offline",
            message: "You are offline. Some features may be unavailable.",
          }),
          {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "application/json" },
          },
        );
      }),
    );
    return;
  }

  // Static assets - cache first with network fallback
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".gif") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      caches
        .match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request).then((response) => {
            // Clone the response
            const clonedResponse = response.clone();

            // Cache new assets
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clonedResponse);
              });
            }

            return response;
          });
        })
        .catch(() => {
          // Return a placeholder for failed assets
          if (request.destination === "image") {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f0f0f0" width="100" height="100"/></svg>',
              { headers: { "Content-Type": "image/svg+xml" } },
            );
          }
          return new Response("Offline", { status: 503 });
        }),
    );
    return;
  }

  // Document requests - network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (
          response.status === 200 &&
          (request.mode === "navigate" ||
            response.headers.get("content-type")?.includes("text/html"))
        ) {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return (
            cachedResponse ||
            new Response(
              "<h1>Offline</h1><p>You are offline. Please check your connection.</p>",
              { status: 503, headers: { "Content-Type": "text/html" } },
            )
          );
        });
      }),
  );
});

// Push notification event
self.addEventListener("push", (event) => {
  const options = {
    badge: "/icon-192x192.png",
    icon: "/icon-192x192.png",
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.title = data.title || "TaskFlow Notification";
      options.body = data.body || "";
      options.tag = data.tag || "notification";
    } catch {
      options.title = "TaskFlow";
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(options.title, options));
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    }),
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag);

  if (event.tag === "sync-messages") {
    event.waitUntil(
      // Attempt to sync messages when back online
      fetch("/api/chat/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch((error) => {
        console.log("[SW] Sync failed, will retry:", error);
        throw error; // Rethrow to trigger retry
      }),
    );
  }
});

// Message handler for client communication
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
