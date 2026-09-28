// Firebase client configuration for Kapeng Barako Customer Accounts.
// This is the Firebase Web App config for project: kapengbarako-f8cb3.
// Do not put Firebase Admin SDK/service-account credentials in this file.

export const firebaseConfig = {
  apiKey: "AIzaSyDGdzGnOvzDCkTxQ24l7jF5ROdy9UZDX90",
  authDomain: "kapengbarako-f8cb3.firebaseapp.com",
  projectId: "kapengbarako-f8cb3",
  storageBucket: "kapengbarako-f8cb3.firebasestorage.app",
  messagingSenderId: "348195577467",
  appId: "1:348195577467:web:4454e05ea170f666f70cde"
};

export const isFirebaseConfigured =
  Object.values(firebaseConfig).every(v => v && !String(v).startsWith("REPLACE_WITH_"));
