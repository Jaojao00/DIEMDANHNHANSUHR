import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDMNXAQiU27NbYm217RjkGt_0OOYVnFGWM",
  authDomain: "caigidonha.firebaseapp.com",
  projectId: "caigidonha",
  storageBucket: "caigidonha.firebasestorage.app",
  messagingSenderId: "616964012819",
  appId: "1:616964012819:web:5dd98d3e265f86dadd78e6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.FirebaseDB = {
    app,
    db,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where
};
