(() => {
  "use strict";

  const read = (key, fallback) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };

  const settings = {
    email: "",
    phone: "",
    location: "",
    ...(read("kb_settings", {}) || {})
  };

  document.querySelectorAll("[data-kb-email]").forEach(el => {
    el.textContent = settings.email || "Contact email not configured";
  });

  document.querySelectorAll("[data-kb-phone]").forEach(el => {
    el.textContent = settings.phone || "Phone not configured";
  });

  document.querySelectorAll("[data-kb-location]").forEach(el => {
    el.textContent = settings.location || "Location not configured";
  });

  const form = document.querySelector("#contactForm");
  const note = form?.parentElement?.querySelector(".form-note");

  if (!form) return;

  const configuredEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(settings.email || "").trim());

  if (configuredEmail) {
    form.action = "https://formsubmit.co/" + encodeURIComponent(settings.email.trim());
    if (note) note.textContent = "Messages are sent to the configured business email.";
  } else {
    form.addEventListener("submit", event => {
      event.preventDefault();

      const data = new FormData(form);
      const message = {
        id: "MSG-" + Date.now().toString(36).toUpperCase(),
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        message: String(data.get("message") || "").trim(),
        createdAt: new Date().toISOString(),
        status: "New"
      };

      const list = read("kb_contact_messages", []);
      const saved = write("kb_contact_messages", [
        message,
        ...(Array.isArray(list) ? list : [])
      ]);

      const success = document.createElement("div");
      success.className = "form-success";
      success.textContent = saved
        ? "Your message has been saved. The business email is not configured yet, so no email was sent."
        : "Your message could not be saved in this browser. Please contact the business directly.";

      form.replaceWith(success);
    });

    if (note) note.textContent = "The business email is not configured yet. Submissions are saved locally until an email is configured.";
  }

  window.addEventListener("storage", event => {
    if (event.key === "kb_settings") window.location.reload();
  });
})();