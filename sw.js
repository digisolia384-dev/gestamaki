/* =====================================================================
   SERVICE WORKER — Kaya Ambiance
   But : permettre l'ouverture de l'app même sans connexion internet,
   en gardant en cache la page principale et les librairies externes
   (React, Babel, Firebase). Les données restent gérées par
   localStorage / Firestore dans l'app elle-même.
   ===================================================================== */

const CACHE_NAME = "kaya-ambiance-v1";

// Fichiers de l'application à mettre en cache dès l'installation.
// Adapte "./index.html" si tu renommes le fichier HTML.
const FICHIERS_APP = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll échouerait si un seul fichier manque : on ajoute un par un
      // pour que l'installation ne bloque pas sur une ressource externe indisponible.
      return Promise.all(
        FICHIERS_APP.map((url) =>
          cache.add(url).catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(
        noms.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

/* Stratégie : réseau d'abord, puis cache en secours (utile hors ligne).
   Les réponses réseau réussies sont aussi remises en cache pour la
   prochaine fois (y compris les CDN externes en mode "no-cors"). */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, copie).catch(() => {});
        });
        return reponse;
      })
      .catch(() =>
        caches.match(event.request).then((reponseCache) => {
          if (reponseCache) return reponseCache;
          // Repli ultime : la page principale si on demandait une navigation
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        })
      )
  );
});
