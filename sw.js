// Service Worker Agari HR (Offline-First & Smart Caching)
const CACHE_NAME = 'hr-app-v94';

const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/mid-logobg.webp',
  './css/style.css',
  './js/config.js',
  './js/utils.js',
  './js/firebaseInit.js',
  './js/dataManager.js',
  './js/employee.js',
  './js/app.js',
  './js/admin/adminCore.js',
  './js/admin/adminUI.js',
  './js/admin/adminSalary.js',
  './js/admin/adminBooking.js',
  './js/admin/adminRequests.js',
  './js/admin/adminRegistration.js',
  './js/admin/adminManager.js',
  './js/registration/regAPI.js',
  './js/registration/regApp.js',
  './manifest.json'
];

// Cài đặt Service Worker và lưu tĩnh cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets:', CACHE_NAME);
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Xóa bỏ các cache cũ khi kích hoạt phiên bản mới
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Xử lý fetch: Chỉ xử lý HTTP/HTTPS GET request (Tránh lỗi chrome-extension)
self.addEventListener('fetch', (event) => {
  // Bỏ qua các scheme không phải HTTP/HTTPS (như chrome-extension://, moz-extension://)
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return;
  }

  // Bỏ qua nếu không phải phương thức GET (Cache API chỉ hỗ trợ GET)
  if (event.request.method !== 'GET') {
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(event.request.url);
  } catch (e) {
    return;
  }

  // Không cache request đến Google Apps Script API hoặc Firebase
  if (
    requestUrl.hostname.includes('script.google.com') ||
    requestUrl.hostname.includes('googleapis.com') ||
    requestUrl.hostname.includes('firestore') ||
    requestUrl.hostname.includes('firebase')
  ) {
    return; // Pass through to network
  }

  // Network first cho tài nguyên HTML, fallback cache
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              if (event.request.url.startsWith('http')) {
                cache.put(event.request, clone).catch(() => {});
              }
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request) || caches.match('./index.html'))
    );
    return;
  }

  // Stale-while-revalidate cho tài nguyên static
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              if (event.request.url.startsWith('http')) {
                cache.put(event.request, clone).catch(() => {});
              }
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
