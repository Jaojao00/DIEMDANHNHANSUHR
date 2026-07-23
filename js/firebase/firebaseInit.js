/**
 * AGR - Firebase Initialization
 * File này khởi tạo Firebase App, Firestore và export các hàm cần thiết
 * ra window.FirebaseDB để các module khác sử dụng.
 *
 * ⚠️ HƯỚNG DẪN:
 * 1. Vào https://console.firebase.google.com
 * 2. Tạo project mới (hoặc dùng project cũ)
 * 3. Vào Project Settings > General > Your apps > Add web app
 * 4. Copy firebaseConfig vào bên dưới
 * 5. Vào Firestore Database > Create database > Start in test mode
 */

// =============================================
// 🔑 FIREBASE CONFIG — THAY THẾ BẰNG CONFIG CỦA BẠN
const firebaseConfig = {
  apiKey: "AIzaSyDMNXAQiU27NbYm217RjkGt_0OOYVnFGWM",
  authDomain: "caigidonha.firebaseapp.com",
  projectId: "caigidonha",
  storageBucket: "caigidonha.firebasestorage.app",
  messagingSenderId: "616964012819",
  appId: "1:616964012819:web:5dd98d3e265f86dadd78e6"
};

// =============================================
// KHỞI TẠO FIREBASE
// =============================================
let firebaseApp = null;
let firestoreDb = null;
let firebaseInitialized = false;

function initFirebase() {
  try {
    // Kiểm tra config đã được cài đặt chưa
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
      console.warn(
        "⚠️ Firebase chưa được cấu hình! Hệ thống sẽ chạy ở chế độ Google Sheets Only.\n" +
        "Xem hướng dẫn trong js/firebase/firebaseInit.js"
      );
      window.FirebaseDB = null;
      return false;
    }

    // Kiểm tra SDK đã load chưa
    if (typeof firebase === "undefined") {
      console.error("❌ Firebase SDK chưa được load. Kiểm tra thẻ <script> trong index.html");
      window.FirebaseDB = null;
      return false;
    }

    // Khởi tạo Firebase App (chỉ 1 lần)
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
      firebaseApp = firebase.apps[0];
    }

    // Khởi tạo Firestore
    firestoreDb = firebase.firestore();

    // Bật offline persistence cho Firestore (hoạt động không cần mạng)
    firestoreDb.enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
        if (err.code === "failed-precondition") {
          console.warn("Firestore persistence: Nhiều tab đang mở, chỉ 1 tab có persistence");
        } else if (err.code === "unimplemented") {
          console.warn("Firestore persistence: Trình duyệt không hỗ trợ");
        }
      });

    // =============================================
    // EXPORT ra window.FirebaseDB (tương thích code cũ)
    // =============================================
    const db = firestoreDb;

    window.FirebaseDB = {
      // Firestore instance
      db: db,
      app: firebaseApp,

      // Collection & Document references
      collection: (db, name) => db.collection(name),
      doc: (db, ...pathSegments) => db.doc(pathSegments.join("/")),

      // Query functions
      query: (collRef, ...constraints) => {
        let q = collRef;
        constraints.forEach((c) => {
          if (c._type === "where") {
            q = q.where(c.field, c.op, c.value);
          } else if (c._type === "orderBy") {
            q = q.orderBy(c.field, c.direction);
          } else if (c._type === "limit") {
            q = q.limit(c.value);
          }
        });
        return q;
      },

      // Where clause builder
      where: (field, op, value) => ({ _type: "where", field, op, value }),

      // OrderBy builder
      orderBy: (field, direction = "asc") => ({ _type: "orderBy", field, direction }),

      // Limit builder  
      limit: (value) => ({ _type: "limit", value }),

      // CRUD operations
      getDocs: async (queryRef) => {
        const snapshot = await queryRef.get();
        return {
          empty: snapshot.empty,
          size: snapshot.size,
          docs: snapshot.docs,
          forEach: (cb) => snapshot.forEach(cb),
        };
      },

      getDoc: async (docRef) => {
        const snap = await docRef.get();
        return {
          exists: snap.exists,
          id: snap.id,
          data: () => snap.data(),
        };
      },

      addDoc: async (collRef, data) => {
        const docRef = await collRef.add(data);
        return docRef;
      },

      setDoc: async (docRef, data, options) => {
        if (options?.merge) {
          await docRef.set(data, { merge: true });
        } else {
          await docRef.set(data);
        }
      },

      updateDoc: async (docRef, data) => {
        await docRef.update(data);
      },

      deleteDoc: async (docRef) => {
        await docRef.delete();
      },

      // Real-time listener
      onSnapshot: (queryRef, callback) => {
        return queryRef.onSnapshot((snapshot) => {
          // Wrap snapshot to match modular API format
          const wrapped = {
            empty: snapshot.empty,
            size: snapshot.size,
            docs: snapshot.docs,
            forEach: (cb) => snapshot.forEach(cb),
            docChanges: () =>
              snapshot.docChanges().map((change) => ({
                type: change.type,
                doc: {
                  id: change.doc.id,
                  data: () => change.doc.data(),
                  ref: change.doc.ref,
                },
              })),
          };
          callback(wrapped);
        });
      },

      // Batch operations
      writeBatch: () => db.batch(),

      // Transaction
      runTransaction: (updateFn) => db.runTransaction(updateFn),

      // Server timestamp
      serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),

      // Timestamp conversion
      Timestamp: firebase.firestore.Timestamp,
    };

    firebaseInitialized = true;
    console.log("✅ Firebase Firestore đã khởi tạo thành công!");
    return true;
  } catch (err) {
    console.error("❌ Lỗi khởi tạo Firebase:", err);
    window.FirebaseDB = null;
    return false;
  }
}

// Tự động khởi tạo khi script load
initFirebase();
