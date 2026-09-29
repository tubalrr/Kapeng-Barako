import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-functions.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

let app = null;
let auth = null;
let functionsInstance = null;

function ensureApp() {
  if (!isFirebaseConfigured) return null;
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = auth || getAuth(app);
  functionsInstance = functionsInstance || getFunctions(app);
  return app;
}

export function backendReady() {
  return Boolean(isFirebaseConfigured && ensureApp());
}

export function getBackendAuth() {
  ensureApp();
  return auth;
}

export function getBackendFunctions() {
  ensureApp();
  return functionsInstance;
}

export async function waitForBackendAuth() {
  if (!backendReady()) throw new Error("Firebase backend is not configured.");
  const currentAuth = getBackendAuth();

  if (typeof currentAuth?.authStateReady === "function") {
    await currentAuth.authStateReady();
  }

  return currentAuth?.currentUser || null;
}

export async function createCentralOrder(payload) {
  const user = await waitForBackendAuth();
  if (!user) throw new Error("Please sign in to your customer account before placing an online order.");
  const fn = httpsCallable(getBackendFunctions(), "createOrder");
  const result = await fn(payload);
  return result.data;
}

export async function migrateLegacyOrders(orders) {
  if (!backendReady()) throw new Error("Firebase backend is not configured.");
  const fn = httpsCallable(getBackendFunctions(), "migrateLegacyOrders");
  const result = await fn({ orders });
  return result.data;
}

export async function migrateLegacyCatalog(payload) {
  if (!backendReady()) throw new Error("Firebase backend is not configured.");
  const fn = httpsCallable(getBackendFunctions(), "migrateLegacyCatalog");
  const result = await fn(payload);
  return result.data;
}
export async function setAdminPasswordFromGoogle(password) {
  if (!backendReady()) throw new Error("Firebase backend is not configured.");
  const user = getBackendAuth()?.currentUser;
  if (!user) throw new Error("Sign in with the authorized Google account first.");
  const fn = httpsCallable(getBackendFunctions(), "setAdminPasswordFromGoogle");
  const result = await fn({ password });
  return result.data;
}

export async function bootstrapAdminFromEmail() {
  if (!backendReady()) throw new Error("Firebase backend is not configured.");
  const user = getBackendAuth()?.currentUser;
  if (!user) throw new Error("Please complete the admin email sign-in first.");
  const fn = httpsCallable(getBackendFunctions(), "bootstrapAdminFromEmail");
  const result = await fn({});
  return result.data;
}
