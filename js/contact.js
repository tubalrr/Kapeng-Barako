(() => {
  "use strict";
  const read = (key, fallback) => {
    try { const v=localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  };
  const settings = {...{
    email:"ILAG",
    phone:"ILAG",
    location:"ILAG"
  }, ...(read("kb_settings",{})||{})};

  document.querySelectorAll("[data-kb-email]").forEach(el => {
    el.textContent = settings.email || "ILAG";
  });
  document.querySelectorAll("[data-kb-phone]").forEach(el => {
    el.textContent = settings.phone || "ILAG";
  });
  document.querySelectorAll("[data-kb-location]").forEach(el => {
    el.textContent = settings.location || "ILAG";
  });

  const form=document.querySelector("form[action^='https://formsubmit.co/']");
  if(form && settings.email && settings.email !== "ILAG"){
    form.action="https://formsubmit.co/"+encodeURIComponent(settings.email);
    const note=form.parentElement.querySelector(".form-note");
    if(note) note.innerHTML="Messages are sent to the configured business email.";
  }
  window.addEventListener("storage", e => {
    if(e.key==="kb_settings") window.location.reload();
  });
})();