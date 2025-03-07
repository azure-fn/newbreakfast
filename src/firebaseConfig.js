import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc, onSnapshot } from "firebase/firestore";  // Sửa tại đây

const firebaseConfig = {
    apiKey: "AIzaSyCR4wnaIxuMagXkiqhqKJsVFR5zxIq_ESI",
    authDomain: "hokke-breakfast-checkin.firebaseapp.com",
    projectId: "hokke-breakfast-checkin",
    storageBucket: "hokke-breakfast-checkin.firebasestorage.app",
    messagingSenderId: "541921201092",
    appId: "1:541921201092:web:6311fd9cfdffc85d0f3291",
    measurementId: "G-6PCGHW8X5Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);  // Không cần khai báo lại db ở đây

export { db, collection, getDocs, setDoc, doc, deleteDoc, onSnapshot };
