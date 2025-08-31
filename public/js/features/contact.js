import { app, auth, db, storage } from "../firebase.js";
// public/js/features/contact.js
import { initEmail } from "../services/email.js";

export function mountContact(el) {
  // ensure EmailJS init (idempotent)
  initEmail(window.__EMAILJS_CONFIG?.publicKey);

  el.innerHTML = `
    <section class="card" style="max-width:560px">
      <h3>Contact</h3>
      <div class="row" style="gap:10px;flex-wrap:wrap">
        <input id="name" placeholder="Your name"/>
        <input id="email" type="email" placeholder="Your email"/>
      </div>
      <textarea id="msg" rows="6" placeholder="Message…"></textarea>
      <div class="row" style="justify-content:flex-end;margin-top:8px">
        <button id="send" class="btn primary">Send</button>
      </div>
      <div id="result" class="muted" style="margin-top:6px"></div>
    </section>
  `;
  el.querySelector("#send").onclick = async () => {
    const name = el.querySelector("#name").value.trim();
    const email = el.querySelector("#email").value.trim();
    const msg = el.querySelector("#msg").value.trim();
    const cfg = window.__EMAILJS_CONFIG || {};
    const to = cfg.toEmail || email; // fallback

    if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId) {
      el.querySelector("#result").textContent = "EmailJS config missing.";
      return;
    }
    try {
      const params = {
        from_name: name,
        from_email: email,
        message: msg,
        to_email: to,
      };
      await window.emailjs.send(cfg.serviceId, cfg.templateId, params);
      el.querySelector("#result").textContent = "Sent ✓";
      el.querySelector("#msg").value = "";
    } catch (e) {
      el.querySelector("#result").textContent = "Failed: " + (e?.message || e);
    }
  };
}
