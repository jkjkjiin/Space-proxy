import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";
const firebaseConfig = {
  apiKey: "AIzaSyBvbTQcsL1DoipWlO0ckApzkwCZgxBYbzY",
  authDomain: "notes-27f22.firebaseapp.com",
  databaseURL: "https://notes-27f22-default-rtdb.firebaseio.com",
  projectId: "notes-27f22",
  storageBucket: "notes-27f22.firebasestorage.app",
  messagingSenderId: "424229778181",
  appId: "1:424229778181:web:fa531219ed165346fa7d6c",
  measurementId: "G-834FYV6VTR"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
