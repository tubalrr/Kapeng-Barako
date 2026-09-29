(() => {
  "use strict";

  // Single admin session contract for the entire Admin Console.
  const SESSION_KEY = "kb_admin_session";
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
  const DEMO_SESSION_KEY = "kb_demo_admin_session";
  const DEMO_EMAIL = "demo@kapengbarako.local";
  const DEMO_PASSWORD = "demo123456";
  const DEMO_DATA_KEY = "kb_demo_admin_data";

  let firebase = null;
  let auth = null;
  let db = null;
  let initPromise = null;

  function clearLegacySessions() {
    try {
      localStorage.removeItem("kb_admin");
      localStorage.removeItem("kb_admin_firebase");
      sessionStorage.removeItem(DEMO_SESSION_KEY);
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

  function getDemoSeed() {
    const now = Date.now();
    const ago = days => new Date(now - days * 86400000).toISOString();
    return {
      kb_rebuild_products: [
        {
          id: "BARAKO-STRONG-250G", name: "Barako Strong", size: "250g",
          price: 350, stock: 7, badge: "DARK ROAST", roast: "Dark", grind: "Whole",
          image: "", origin: "Batangas", roastDate: "2026-09-28",
          roastLevel: "Dark", netWeight: "250g", batch: "DEMO-01",
          process: "Natural", tastingNotes: "Bold, smoky, full-bodied", featured: false
        },
        {
          id: "BARAKO-CLASSIC-500G", name: "Barako Classic", size: "500g",
          price: 620, stock: 12, badge: "BESTSELLER", roast: "Medium", grind: "Whole",
          image: "", origin: "Batangas", roastDate: "2026-09-28",
          roastLevel: "Medium", netWeight: "500g", batch: "DEMO-02",
          process: "Natural", tastingNotes: "Rich, chocolatey, aromatic", featured: true
        },
        {
          id: "BARAKO-STARTER-BUNDLE", name: "Barako Starter Bundle", size: "250g + 500g",
          price: 870, stock: 4, badge: "SAVE ₱100", roast: "Medium", grind: "Whole", bundle: true,
          image: "", origin: "Batangas", roastDate: "2026-09-28",
          roastLevel: "Medium", netWeight: "750g", batch: "DEMO-03",
          process: "Natural", tastingNotes: "Everyday Barako set", featured: false
        }
      ],
      kb_orders: [
        {
          id: "DEMO-1001", customerUid: "demo-customer-1",
          customer: {uid:"demo-customer-1",name:"Mia Santos",email:"mia.demo@example.com",phone:"09000000001"},
          items:[{id:"BARAKO-CLASSIC-500G",productId:"BARAKO-CLASSIC-500G",name:"Barako Classic",size:"500g",price:620,qty:1,roast:"Medium",grind:"Whole"}],
          subtotal:620,shippingFee:0,discount:0,total:620,address:"Lipa City, Batangas",
          payment:"gcash",paymentMethod:"GCash",gcashRef:"DEMO-GCASH-1001",
          paymentStatus:"Verified",status:"Pending",createdAt:ago(0.4)
        },
        {
          id: "DEMO-1002", customerUid: "demo-customer-2",
          customer: {uid:"demo-customer-2",name:"Carlo Reyes",email:"carlo.demo@example.com",phone:"09000000002"},
          items:[{id:"BARAKO-STRONG-250G",productId:"BARAKO-STRONG-250G",name:"Barako Strong",size:"250g",price:350,qty:2,roast:"Dark",grind:"Whole"}],
          subtotal:700,shippingFee:0,discount:0,total:700,address:"Batangas City, Batangas",
          payment:"cod",paymentMethod:"COD",gcashRef:"",paymentStatus:"unpaid",status:"Ready",createdAt:ago(1.8)
        },
        {
          id: "DEMO-1003", customerUid: "demo-customer-1",
          customer: {uid:"demo-customer-1",name:"Mia Santos",email:"mia.demo@example.com",phone:"09000000001"},
          items:[{id:"BARAKO-STARTER-BUNDLE",productId:"BARAKO-STARTER-BUNDLE",name:"Barako Starter Bundle",size:"250g + 500g",price:870,qty:1,roast:"Medium",grind:"Whole"}],
          subtotal:870,shippingFee:0,discount:0,total:870,address:"Lipa City, Batangas",
          payment:"gcash",paymentMethod:"GCash",gcashRef:"DEMO-GCASH-1003",
          paymentStatus:"Verified",status:"Delivered",createdAt:ago(3.2)
        },
        {
          id: "DEMO-1004", customerUid: "demo-customer-3",
          customer: {uid:"demo-customer-3",name:"Jessa Lim",email:"jessa.demo@example.com",phone:"09000000003"},
          items:[{id:"BARAKO-STRONG-250G",productId:"BARAKO-STRONG-250G",name:"Barako Strong",size:"250g",price:350,qty:1,roast:"Dark",grind:"Whole"}],
          subtotal:350,shippingFee:220,discount:0,total:570,address:"Davao City, Davao",
          payment:"cod",paymentMethod:"COD",gcashRef:"",paymentStatus:"unpaid",status:"Delivered",createdAt:ago(5.1)
        }
      ],
      kb_promos: [
        {id:"P-DEMO10",name:"Demo 10",code:"DEMO10",type:"percent",value:10,minPacks:2,active:true}
      ],
      kb_reviews: [],
      kb_settings: {
        lowStock:5,
        storeStatus:"open",
        deliveryFee:220,
        freeDelivery:0,
        roastSchedule:"Tue & Fri",
        hours:"Mon–Sat · 8:00 AM–5:00 PM"
      },
      kb_cms: {},
      kb_gallery: [],
      kb_ads: {},
      kb_activity_log: [],
      kb_inventory_history: [],
      kb_notification_read: []
    };
  }

  function rememberDemoAdmin() {
    try {
      sessionStorage.setItem(DEMO_DATA_KEY, JSON.stringify(getDemoSeed()));
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({
        uid: "demo-admin",
        email: DEMO_EMAIL,
        role: "demo",
        demo: true,
        signedInAt: new Date().toISOString(),
        expiresAt: Date.now() + SESSION_TTL_MS
      }));
    } catch {}
  }

  function readDemoData() {
    try {
      const raw = sessionStorage.getItem(DEMO_DATA_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return data && typeof data === "object" ? data : null;
    } catch {
      return null;
    }
  }

  function readDemoSession() {
    try {
      const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.demo || !data?.expiresAt || Date.now() >= Number(data.expiresAt)) {
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        return null;
      }
      return data;
    } catch {
      try { sessionStorage.removeItem(DEMO_SESSION_KEY); } catch {}
      return null;
    }
  }

  async function signInDemo(email, password) {
    const normalized = String(email || "").trim().toLowerCase();
    if (normalized !== DEMO_EMAIL || String(password || "") !== DEMO_PASSWORD) {
      throw new Error("Demo account: use demo@kapengbarako.local / demo123456.");
    }
    rememberDemoAdmin();
    return { uid: "demo-admin", email: DEMO_EMAIL, role: "demo", demo: true };
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

  async function signInWithEmailPassword(email, password) {
    const { auth: currentAuth, authMod } = await init();
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) throw new Error("Enter your admin email.");
    if (!password) throw new Error("Enter your admin password.");

    try {
      await authMod.setPersistence(currentAuth, authMod.browserSessionPersistence);
      const signIn = authMod && authMod.signInWithEmailAndPassword;
      if (typeof signIn !== "function") {
        throw new Error("Firebase Auth sign-in module failed to load. Please refresh the page.");
      }
      const credential = await signIn(currentAuth, normalized, password);

      // Bootstrap the authenticated admin UID on the trusted backend.
      // This avoids circular Firestore client permissions during first-time setup.
      if (normalized === "vracelle2@gmail.com") {
        try {
          const backendModule = await import("./firebase-backend.js");
          await backendModule.bootstrapAdminFromEmail();
        } catch (bootstrapError) {
          await authMod.signOut(currentAuth);
          const code = bootstrapError?.code ? ` [${bootstrapError.code}]` : "";
          throw new Error(
            (bootstrapError?.message || "Admin identity bootstrap failed.") + code
          );
        }
      }

      const admin = await verifyAdminWithoutSession(credential.user);
      if (!admin) {
        await authMod.signOut(currentAuth);
        throw new Error("This Firebase email account is authenticated, but its UID is not the active Kapeng Barako admin UID. Use the existing authorized admin account.");
      }

      rememberAdmin(admin);
      return admin;
    } catch (error) {
      if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
        if (normalized === "vracelle2@gmail.com") {
          throw new Error("Firebase rejected the email/password credential. Use “FIRST-TIME SETUP WITH GOOGLE” once to create the password for this existing admin account.");
        }
        throw new Error("Incorrect email or password.");
      }
      if (error?.code === "auth/user-not-found")
        throw new Error("No Firebase account exists for this email.");
      if (error?.code === "auth/operation-not-allowed")
        throw new Error("Email/Password sign-in is not enabled in Firebase Authentication.");
      if (error?.code === "auth/internal-error")
        throw new Error("Firebase returned an internal authentication error. Check that this email has an Email/Password credential in Firebase Authentication.");
      throw error;
    }
  }

  async function setupAdminEmailPassword(password) {
    const { auth: currentAuth, authMod } = await init();
    const normalizedPassword = String(password || "");
    if (normalizedPassword.length < 6 || normalizedPassword.length > 128) {
      throw new Error("Admin password must be 6 to 128 characters.");
    }

    try {
      await authMod.setPersistence(currentAuth, authMod.browserSessionPersistence);

      const provider = new authMod.GoogleAuthProvider();
      const credential = await authMod.signInWithPopup(currentAuth, provider);
      const googleEmail = String(credential.user?.email || "").trim().toLowerCase();

      if (googleEmail !== "vracelle2@gmail.com") {
        await authMod.signOut(currentAuth);
        throw new Error("Use the authorized Google account: vracelle2@gmail.com.");
      }

      const backendModule = await import("./firebase-backend.js");
      await backendModule.setAdminPasswordFromGoogle(normalizedPassword);

      await authMod.signOut(currentAuth);

      const signIn = authMod.signInWithEmailAndPassword;
      if (typeof signIn !== "function") {
        throw new Error("Firebase Auth sign-in module failed to load. Please refresh the page.");
      }

      const emailCredential = await signIn(currentAuth, googleEmail, normalizedPassword);
      const admin = await verifyAdminWithoutSession(emailCredential.user);

      if (!admin) {
        await authMod.signOut(currentAuth);
        throw new Error("Admin password was created, but the admin record could not be verified.");
      }

      rememberAdmin(admin);
      return admin;
    } catch (error) {
      try { await authMod.signOut(currentAuth); } catch {}
      throw error;
    }
  }

  async function sendAdminEmailLink(email) {
    const { auth: currentAuth, authMod } = await init();
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) throw new Error("Enter your admin email.");

    try {
      const actionCodeSettings = {
        url: new URL("./login.html", window.location.href).href,
        handleCodeInApp: true
      };
      await authMod.setPersistence(currentAuth, authMod.browserSessionPersistence);
      await authMod.sendSignInLinkToEmail(currentAuth, normalized, actionCodeSettings);
      localStorage.setItem("kb_admin_email_for_signin", normalized);
      return { email: normalized };
    } catch (error) {
      if (error?.code === "auth/unauthorized-continue-uri")
        throw new Error("This Admin Login URL is not authorized in Firebase Authentication.");
      if (error?.code === "auth/operation-not-allowed")
        throw new Error("Email link sign-in is not enabled yet. Enable Email link in Firebase Authentication → Sign-in method.");
      if (error?.code === "auth/unauthorized-domain")
        throw new Error("Add tubalrr.github.io to Firebase Authentication → Authorized domains.");
      if (error?.code === "auth/quota-exceeded")
        throw new Error("Firebase email-link quota has been reached. No sign-in email was sent. Wait for the quota to reset or add a billing instrument to the Firebase project to increase the email-link limit.");
      throw error;
    }
  }

  async function completeAdminEmailLink() {
    const { auth: currentAuth, authMod } = await init();
    if (!authMod.isSignInWithEmailLink(currentAuth, window.location.href)) return null;

    let email = "";
    try { email = localStorage.getItem("kb_admin_email_for_signin") || ""; } catch {}
    if (!email) email = window.prompt("Confirm your admin email address:");
    email = String(email || "").trim().toLowerCase();
    if (!email) throw new Error("Admin email confirmation is required.");

    const credential = await authMod.signInWithEmailLink(currentAuth, email, window.location.href);
    try { localStorage.removeItem("kb_admin_email_for_signin"); } catch {}

    // The email-link credential may have created a new Firebase UID when
    // the old admin account was originally created with Google. Bootstrap
    // the verified allowlisted admin identity server-side before checking
    // the UID-based Firestore admin record.
    try {
      const backendModule = await import("./firebase-backend.js");
      await backendModule.bootstrapAdminFromEmail();
    } catch (error) {
      await authMod.signOut(currentAuth);
      throw new Error(error?.message || "Admin identity verification failed.");
    }

    const admin = await verifyAdminWithoutSession(credential.user);
    if (!admin) {
      await authMod.signOut(currentAuth);
      throw new Error("This email is not authorized for the Kapeng Barako Admin Console.");
    }

    rememberAdmin(admin);
    return admin;
  }

  async function verifyAdminWithoutSession(user) {
    if (!user) return null;
    const { db: currentDb, firestoreMod } = await init();
    const snap = await firestoreMod.getDoc(
      firestoreMod.doc(currentDb, "admins", user.uid)
    );
    if (!snap.exists() || snap.data()?.active !== true) return null;
    return { uid: user.uid, email: user.email || "", ...snap.data() };
  }

  async function restore() {
    const demo = readDemoSession();
    if (demo) return demo;

    // No local admin session means there is nothing to restore.
    // Redirect immediately instead of waiting on Firebase Auth initialization.
    const session = readSession();
    if (!session) {
      return null;
    }

    const user = await currentUser();

    if (!user || session.uid !== user.uid) {
      rememberAdmin(null);
      try {
        const { auth: currentAuth, authMod } = await init();
        await authMod.signOut(currentAuth);
      } catch {}
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
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      sessionStorage.removeItem(DEMO_DATA_KEY);
      const { auth: currentAuth, authMod } = await init();
      await authMod.signOut(currentAuth);
    } finally {
      rememberAdmin(null);
    }
  }

  window.KBAdminAuth = {
    SESSION_KEY,
    SESSION_TTL_MS,
    DEMO_SESSION_KEY,
    DEMO_EMAIL,
    DEMO_PASSWORD,
    DEMO_DATA_KEY,
    readDemoData,
    init,
    signInWithEmailPassword,
    setupAdminEmailPassword,
    signInDemo,
    sendAdminEmailLink,
    completeAdminEmailLink,
    restore,
    requireAdmin,
    logout,
    verifyAdmin
  };
})();