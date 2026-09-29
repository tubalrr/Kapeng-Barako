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

  const rawSettings = read("kb_settings", {});
  const settings = rawSettings && typeof rawSettings === "object" && !Array.isArray(rawSettings)
    ? rawSettings
    : {};
  const emailValue = String(settings.email || "").trim();
  const phoneValue = String(settings.phone || "").trim();
  const locationValue = String(settings.location || "").trim();

  document.querySelectorAll("[data-kb-email]").forEach(el => {
    el.textContent = emailValue;
  });
  document.querySelectorAll("[data-kb-phone]").forEach(el => {
    el.textContent = phoneValue;
  });
  document.querySelectorAll("[data-kb-location]").forEach(el => {
    el.textContent = locationValue;
  });

  document.querySelectorAll('[data-kb-contact-detail="email"]').forEach(el => {
    el.hidden = !emailValue;
  });
  document.querySelectorAll('[data-kb-contact-detail="phone"]').forEach(el => {
    el.hidden = !phoneValue;
  });
  document.querySelectorAll('[data-kb-contact-detail="location"]').forEach(el => {
    el.hidden = !locationValue;
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
        ? "Your message has been saved locally. Email delivery is unavailable until a business email is configured in Admin → Contact."
        : "Your message could not be saved in this browser. Please contact the business directly.";

      form.replaceWith(success);
    });

    if (note) note.textContent = configuredEmail
      ? "Messages are sent to the business email configured in Admin → Contact."
      : "Messages are saved locally until a business email is configured in Admin → Contact.";
  }

  window.addEventListener("storage", event => {
    if (event.key === "kb_settings") window.location.reload();
  });
})();