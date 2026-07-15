/**
 * Firebase configuration
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAeAQgJJh3oYpKA3EFOVggYqsyDwivcC-g",
  authDomain: "pepperwahl-18d42.firebaseapp.com",
  projectId: "pepperwahl-18d42",
  storageBucket: "pepperwahl-18d42.firebasestorage.app",
  messagingSenderId: "759162701457",
  appId: "1:759162701457:web:680f1cbcb4974583db2130",
  measurementId: "G-15DYJNQH8K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
