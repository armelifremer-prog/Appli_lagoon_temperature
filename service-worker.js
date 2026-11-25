
const CACHE_NAME = "lagoon-survey-v4";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./logo_Ifremer_blue.jpg",
    "./manifest.json",
    "./icon2-192.png",
    "./icon2-512.png"
];

// Installation : mise en cache de tous les fichiers essentiels
self.addEventListener("install", event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await cache.addAll(FILES_TO_CACHE);
            await self.skipWaiting();
        })()
    );
});

// Activation : suppression des anciennes versions de notre cache
self.addEventListener("activate", event => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();

            await Promise.all(
                keys
                    .filter(key =>
                        key.startsWith("lagoon-survey-") &&
                        key !== CACHE_NAME
                    )
                    .map(key => caches.delete(key))
            );

            await self.clients.claim();
        })()
    );
});

// Chargement : priorité aux fichiers enregistrés localement
self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") return;

    const requestURL = new URL(event.request.url);

    // Ne pas intercepter les requêtes vers d'autres domaines
    if (requestURL.origin !== self.location.origin) return;

    event.respondWith(
        (async () => {

            // Cas particulier : ouverture de l'application
            if (event.request.mode === "navigate") {

                const cachedPage = await caches.match("./index.html");

                if (cachedPage) {
                    return cachedPage;
                }
            }

            // Recherche dans le cache
            const cachedResponse = await caches.match(event.request);

            if (cachedResponse) {
                return cachedResponse;
            }

            // Si le fichier n'est pas en cache, tentative réseau
            try {
                const response = await fetch(event.request);

                if (response.ok) {
                    const cache = await caches.open(CACHE_NAME);
                    await cache.put(event.request, response.clone());
                }

                return response;

            } catch (error) {

                // Aucun fichier disponible
                return new Response(
                    "This resource is unavailable offline.",
                    {
                        status: 503,
                        headers: {
                            "Content-Type": "text/plain"
                        }
                    }
                );
            }
        })()
    );
});
