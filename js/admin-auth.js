(() => {
  "use strict";

  // Single admin session contract for the entire Admin Console.
  const SESSION_KEY = "kb_admin_session";
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

  let firebase = null;
  let auth = null;
  let db = null;
  let initPromise = null;

  function clearLegacySessions() {
    try {
      localStorage.removeItem("kb_admin");
      localStorage.removeItem("kb_admin_firebase");
    } catch {}
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      clearLegacySessions();

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

      // Admin login is session-only on the web. Firebase documents that
      // browserSessionPersistence is cleared when the authenticated tab closes.
      if (auth.currentUser) {
        await authMod.setPersistence(auth, authMod.browserSessionPersistence);
      }

      return { firebase, auth, db, authMod, firestoreMod };
    })();
    return initPromise;
  }

  function withTimeout(promise, ms, message) {
    let timer = null;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(message);
          error.code = "AUTH_TIMEOUT";
          reject(error);
        }, ms);
      })
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.uid || !data?.expiresAt || Date.now() >= Number(data.expiresAt)) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch {
      try { sessionStorage.removeItem(SESSION_KEY); } catch {}
      return null;
    }
  }

  function rememberAdmin(admin) {
    try {
      if (!admin) sessionStorage.removeItem(SESSION_KEY);
      else sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        uid: admin.uid,
        email: admin.email || "",
        role: admin.role || "admin",
        signedInAt: new Date().toISOString(),
        expiresAt: Date.now() + SESSION_TTL_MS
      }));
    } catch {}
  }

  async function currentUser() {
    const { auth: currentAuth, authMod } = await init();
    if (currentAuth.currentUser) return currentAuth.currentUser;

    return withTimeout(
      new Promise(resolve => {
        let settled = false;
        let unsubscribe = () => {};
        unsubscribe = authMod.onAuthStateChanged(currentAuth, user => {
          if (settled) return;
          settled = true;
          unsubscribe();
          resolve(user || null);
        });
      }),
      8000,
      "Firebase Authentication timed out. Check Authorized Domains and Firebase configuration."
    );
  }

  async function verifyAdmin(user) {
    if (!user) return null;
    const session = readSession();
    if (!session || session.uid !== user.uid) return null;

    const { db: currentDb, firestoreMod } = await init();
    const snap = await withTimeout(
      firestoreMod.getDoc(firestoreMod.doc(currentDb, "admins", user.uid)),
      8000,
      "Firebase admin verification timed out. Check Firestore rules and network access."
    );
    if (!snap.exists() || snap.data()?.active !== true) return null;

    return { uid: user.uid, email: user.email || "", ...snap.data() };
  }

  async function authenticate(email, password) {
    const { auth: currentAuth, authMod } = await init();
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || !password) throw new Error("Enter your admin email and password.");

    try {
      await authMod.setPersistence(currentAuth, authMod.browserSessionPersistence);
      const credential = await authMod.signInWithEmailAndPassword(currentAuth, normalized, String(password));
      const admin = await verifyAdminWithoutSession(credential.user);

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

  async function verifyAdminWithoutSession(user) {
    if (!user) return null;
    const { db: currentDb, firestoreMod } = await init();
    const snap = await firestoreMod.getDoc(firestoreMod.doc(currentDb, "admins", user.uid));
    if (!snap.exists() || snap.data()?.active !== true) return null;
    return { uid: user.uid, email: user.email || "", ...snap.data() };
  }

  async function restore() {
    const session = readSession();
    const user = await currentUser();

    if (!session || !user || session.uid !== user.uid) {
      if (!session && user) {
        const { auth: currentAuth, authMod } = await init();
        await authMod.signOut(currentAuth);
      }
      rememberAdmin(null);
      return null;
    }

    const admin = await verifyAdmin(user);
    if (!admin) {
      const { auth: currentAuth, authMod } = await init();
      await authMod.signOut(currentAuth);
      rememberAdmin(null);
      return null;
    }

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
    try {
      const { auth: currentAuth, authMod } = await init();
      await authMod.signOut(currentAuth);
    } finally {
      rememberAdmin(null);
    }
  }

  window.KBAdminAuth = {
    SESSION_KEY,
    SESSION_TTL_MS,
    init,
    authenticate,
    restore,
    requireAdmin,
    logout,
    verifyAdmin
  };
})();