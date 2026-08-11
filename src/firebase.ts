import { initializeApp } from "firebase/app";

// Official Web Firebase Configuration for Zerrouki Sweets
export const firebaseConfig = {
  apiKey: "AIzaSyCLAiA6Gs5ReG8MjKLShC-ylMJWrSCwL5s",
  authDomain: "zerrouki-b8891.firebaseapp.com",
  projectId: "zerrouki-b8891",
  storageBucket: "zerrouki-b8891.firebasestorage.app",
  messagingSenderId: "445522085355",
  appId: "1:445522085355:web:9a40244dd145b93a76c5ae",
  measurementId: "G-2ZN522ECMN"
};

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);
