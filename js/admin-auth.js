(() => {
  "use strict";

  const SESSION_KEY = "kb_admin_session";
  const USER_KEY = "kb_admin_user";
  const SESSION_MS = 8 * 60 * 60 * 1000;
  const SEED_EMAIL = "admin@kapengbarako.com";
  const SEED_PASSWORD = "barako123";

  const safeParse = (value, fallback = null) => {
    try { return JSON.parse(value); } catch { return fallback; }
  };

  async function sha256(text) {
    if (!window.crypto?.subtle) return btoa(unescape(encodeURIComponent(text)));
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function seedUser() {
    const existing = safeParse(localStorage.getItem(USER_KEY));
    if (existing?.email && existing?.passwordHash && existing.role === "admin") return existing;
    const user = {
      email: SEED_EMAIL,
      passwordHash: await sha256(SEED_PASSWORD),
      role: "admin",
      active: true,
      seededAt: new Date().toISOString()
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  function getSession() {
    const session = safeParse(localStorage.getItem(SESSION_KEY));
    if (!session?.token || !session.expiresAt || Date.now() >= Number(session.expiresAt)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  }

  function isAdmin() {
    const session = getSession();
    return Boolean(session?.role === "admin" && session?.email);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function loginUrl() {
    return location.pathname.includes("/pages/admin/") ? "./login.html" : "pages/admin/login.html";
  }

  // Protect the dashboard before admin.js initializes.
  if (location.pathname.endsWith("/pages/admin/index.html")) {
    if (!isAdmin()) location.replace("./login.html");
  }

  window.KBAdminAuth = {
    SESSION_KEY, USER_KEY,
    seedUser, getSession, isAdmin, clearSession,
    async authenticate(email, password) {
      const user = await seedUser();
      const normalized = String(email || "").trim().toLowerCase();
      if (!user.active || normalized !== user.email.toLowerCase()) return false;
      const passwordHash = await sha256(String(password || ""));
      return passwordHash === user.passwordHash;
    },
    startSession(email) {
      const session = {
        token: (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()).replace(/-/g, ""),
        email: String(email).trim().toLowerCase(),
        role: "admin",
        issuedAt: Date.now(),
        expiresAt: Date.now() + SESSION_MS
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    },
    logout() {
      clearSession();
      if (!location.pathname.endsWith("/pages/admin/login.html")) location.replace(loginUrl());
    },
    guard() {
      if (location.pathname.endsWith("/pages/admin/index.html") && !isAdmin()) {
        location.replace("./login.html");
        return false;
      }
      return true;
    }
  };
})();