/**
 * Firebase configuration
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBNZRCyZu9y99puB4vGoWuK21NcTJ8JbkE",
  authDomain: "hostsliceresponse.firebaseapp.com",
  projectId: "hostsliceresponse",
  storageBucket: "hostsliceresponse.firebasestorage.app",
  messagingSenderId: "19783450306",
  appId: "1:19783450306:web:bb503c9ffe26ce290e455b",
  measurementId: "G-1444H8DE56"
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
