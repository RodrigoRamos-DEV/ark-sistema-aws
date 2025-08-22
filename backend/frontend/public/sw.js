// Service Worker desabilitado temporariamente para debug
console.log('🔧 Service Worker desabilitado para debug');

// Limpa todos os caches existentes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('🗑️ Removendo cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});