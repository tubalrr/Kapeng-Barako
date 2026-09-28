(() => {
  "use strict";

  const SESSION_KEY = "kb_admin_firebase";
  let firebase = null;
  let auth = null;
  let db = null;
  let initPromise = null;

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const configModule = await import("./firebase-config.js");
      if (!configModule.isFirebaseConfigured) {
        const error = new Error("Firebase is not configured. Add the Firebase Web App config in js/firebase-config.js.");
        error.code = "FIREBASE_NOT_CONFIGURED";
        throw error;
      }

      const [appMod, authMod, firestoreMod] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js")
      ]);

      firebase = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(configModule.firebaseConfig);
      auth = authMod.getAuth(firebase);
      db = firestoreMod.getFirestore(firebase);
      return { firebase, auth, db, authMod, firestoreMod };
    })();
    return initPromise;
  }

  async function currentUser() {
    const { auth: currentAuth, authMod } = await init();
    if (currentAuth.currentUser) return currentAuth.currentUser;
    return new Promise(resolve => {
      let settled = false;
      const unsubscribe = authMod.onAuthStateChanged(currentAuth, user => {
        if (settled) return;
        settled = true;
        unsubscribe();
        resolve(user || null);
      });
    });
  }

  async function verifyAdmin(user) {
    if (!user) return null;
    const { db: currentDb, firestoreMod } = await init();
    const snap = await firestoreMod.getDoc(firestoreMod.doc(currentDb, "admins", user.uid));
    if (!snap.exists() || snap.data()?.active !== true) return null;
    return { uid: user.uid, email: user.email || "", ...snap.data() };
  }

  function rememberAdmin(admin) {
    if (!admin) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify({
      uid: admin.uid,
      email: admin.email || "",
      verifiedAt: new Date().toISOString()
    }));
  }

  async function authenticate(email, password) {
    const { auth: currentAuth, authMod } = await init();
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || !password) throw new Error("Enter your admin email and password.");

    try {
      const credential = await authMod.signInWithEmailAndPassword(currentAuth, normalized, String(password));
      const admin = await verifyAdmin(credential.user);
      if (!admin) {
        await authMod.signOut(currentAuth);
        throw new Error("This account is not authorized for the Kapeng Barako Admin Console.");
      }
      rememberAdmin(admin);
      return admin;
    } catch (error) {
      rememberAdmin(null);
      if (["auth/invalid-credential","auth/invalid-login-credentials","auth/user-not-found","auth/wrong-password"].includes(error?.code)) {
        throw new Error("Invalid admin email or password.");
      }
      throw error;
    }
  }

  async function restore() {
    const user = await currentUser();
    const admin = await verifyAdmin(user);
    if (!admin) {
      rememberAdmin(null);
      return null;
    }
    rememberAdmin(admin);
    return admin;
  }

  async function requireAdmin() {
    try {
      return await restore();
    } catch (error) {
      rememberAdmin(null);
      throw error;
    }
  }

  async function logout() {
    const { auth: currentAuth, authMod } = await init();
    await authMod.signOut(currentAuth);
    rememberAdmin(null);
  }

  window.KBAdminAuth = { SESSION_KEY, init, authenticate, restore, requireAdmin, logout, verifyAdmin };
})();