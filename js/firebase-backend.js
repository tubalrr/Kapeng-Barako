import { getApps, getApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-functions.js";
import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

let functionsInstance = null;

export function backendReady() {
  return Boolean(isFirebaseConfigured && getApps().length);
}

export function getBackendFunctions() {
  if (!isFirebaseConfigured) return null;
  if (!functionsInstance) {
    functionsInstance = getFunctions(getApp());
  }
  return functionsInstance;
}

export async function createCentralOrder(payload) {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase backend is not configured.");
  }
  const fn = httpsCallable(getBackendFunctions(), "createOrder");
  const result = await fn(payload);
  return result.data;
}

export async function migrateLegacyOrders(orders) {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase backend is not configured.");
  }
  const fn = httpsCallable(getBackendFunctions(), "migrateLegacyOrders");
  const result = await fn({ orders });
  return result.data;
}
