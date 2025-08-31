// public/js/main.js — Part A
// --------------------------
// 1) Firebase (modular) init (reads window.__FIREBASE_CONFIG from index.html)
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

// ---- Guard config
const cfg = window.__FIREBASE_CONFIG;
if (!cfg) {
  throw new Error("Missing window.__FIREBASE_CONFIG in index.html");
}
// ---- Initialize only once
const app = getApps().length ? getApps()[0] : initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Expose for other modules (if they need)
window.LH = { app, auth, db, storage };

// 2) Feature modules (mount-style ONLY; avoid duplicate `view*` imports)
import { watchAuth, login, logout, signup, forgot, isAdmin } from "./auth.js";
import { mountDashboard } from "./features/dashboard.js";
import { mountCourses } from "./features/courses.js";
import { mountMyLearning } from "./features/mylearning.js";
import { mountTasks } from "./features/tasks.js";
import { mountProfile } from "./features/profile.js";
import { mountChat } from "./features/chat.js";
import { mountSettings } from "./features/settings.js";
import { mountAdmin } from "./features/admin.js";
import { mountContact } from "./features/contact.js"; // if used
// (သတိ: `viewCourses` / `viewDashboard` တို့နဲ့ ရောမထည့်ပါ — duplicate declaration error မျလာစေနှို့)

// 3) EmailJS init (optional)
try {
  if (window.__EMAILJS_CONFIG?.publicKey && window.emailjs?.init) {
    window.emailjs.init(window.__EMAILJS_CONFIG.publicKey);
  }
} catch (e) {
  console.warn("EmailJS init skipped:", e);
}

// 4) Today date
(function setToday() {
  const el = document.getElementById("today");
  if (!el) return;
  const d = new Date();
  el.textContent = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
})();

// 5) Burger / Sidebar
document.getElementById("burger")?.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-open");
});

// 6) Logout (modular only)
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  try {
    await logout();
  } catch (e) {
    console.error(e);
  }
});

// 7) Live theme + font-size (Settings page buttons will have data-attrs)
function applyTheme(name) {
  document.documentElement.dataset.theme = name;
  localStorage.setItem("lh_theme", name);
}
function applyFontScale(scale) {
  document.documentElement.style.setProperty("--font-scale", scale);
  localStorage.setItem("lh_font", scale);
}
(function bootTheme() {
  applyTheme(localStorage.getItem("lh_theme") || "slate");
  applyFontScale(localStorage.getItem("lh_font") || "1.0");
})();
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-theme]");
  if (t) applyTheme(t.dataset.theme);
  const f = e.target.closest("[data-font]");
  if (f) applyFontScale(f.dataset.font);
});

// 8) Global search → dispatch a custom event
document.getElementById("globalSearch")?.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  window.dispatchEvent(new CustomEvent("app:search", { detail: { q } }));
});

// 9) Make sidebar links react instantly (no refresh needed)
document.querySelectorAll(".nav .nav-item").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const to = a.getAttribute("href");
    if (to && to !== location.hash) {
      location.hash = to;
    }
  });
});

// public/js/main.js — Part B
// --------------------------

// Admin check (roles/{uid}.role === "admin")
async function isAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, "roles", uid));
    return !!(snap.exists() && snap.data()?.role === "admin");
  } catch (e) {
    console.warn("isAdmin check failed:", e);
    return false;
  }
}

// Mounts
const outlet = document.getElementById("app");
let CURRENT_USER = null;
let IS_ADMIN = false;
let lastHash = null;

function renderRoute() {
  const hash = location.hash || "#/dashboard";
  if (!outlet) return;
  outlet.innerHTML = "";
  const host = document.createElement("div");
  outlet.appendChild(host);

  if (!CURRENT_USER) {
    mountLogin(host);
    return;
  }

  switch (true) {
    case hash.startsWith("#/dashboard"):
      mountDashboard(host, CURRENT_USER, IS_ADMIN);
      break;
    case hash.startsWith("#/courses"):
      mountCourses(host, CURRENT_USER, IS_ADMIN);
      break;
    case hash.startsWith("#/mylearning"):
      mountMyLearning(host, CURRENT_USER, IS_ADMIN);
      break;
    case hash.startsWith("#/tasks"):
      mountTasks(host, CURRENT_USER, IS_ADMIN);
      break;
    case hash.startsWith("#/profile"):
      mountProfile(host, CURRENT_USER, IS_ADMIN);
      break;
    case hash.startsWith("#/chat"):
      mountChat(host, CURRENT_USER, IS_ADMIN);
      break;
    case hash.startsWith("#/settings"):
      mountSettings(host, CURRENT_USER, IS_ADMIN);
      break;
    case hash.startsWith("#/admin"):
      IS_ADMIN
        ? mountAdmin(host, CURRENT_USER)
        : (host.innerHTML = "<p>Admins only.</p>");
      break;
    case hash.startsWith("#/contact"):
      mountContact(host, CURRENT_USER);
      break;
    default:
      mountDashboard(host, CURRENT_USER, IS_ADMIN);
  }
  lastHash = hash;
}

// ------ Router ------
function mountLogin(container) {
  const tpl = document.getElementById("tpl-login").content.cloneNode(true);
  container.appendChild(tpl);
  const form = container.querySelector("#login-form");
  container.querySelector("#btn-signup").onclick = async () => {
    const email = prompt("Email?");
    const pass = prompt("Password?");
    if (email && pass) await signup(email, pass, email.split("@")[0]);
  };
  container.querySelector("#btn-forgot").onclick = async () => {
    const email = prompt("Enter your email to reset password:");
    if (email) await forgot(email);
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = container.querySelector("#login-email").value.trim();
    const pass = container.querySelector("#login-pass").value;
    await login(email, pass);
  };
}

function route() {
  if (!outlet) return;
  const hash = (location.hash || "#/dashboard").toLowerCase();
  outlet.innerHTML = "";
  const el = document.createElement("div");
  outlet.appendChild(el);

  if (!CURRENT_USER) {
    mountLogin(el);
    return;
  }

  if (hash.startsWith("#/dashboard")) {
    mountDashboard(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
    return;
  }
  if (hash.startsWith("#/courses")) {
    mountCourses(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
    return;
  }
  if (hash.startsWith("#/mylearning")) {
    mountMyLearning(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
    return;
  }
  if (hash.startsWith("#/tasks")) {
    mountTasks(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
    return;
  }
  if (hash.startsWith("#/profile")) {
    mountProfile(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
    return;
  }
  if (hash.startsWith("#/chat")) {
    mountChat(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
    return;
  }
  if (hash.startsWith("#/settings")) {
    mountSettings(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
    return;
  }
  if (hash.startsWith("#/admin")) {
    if (IS_ADMIN) {
      mountAdmin(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
    } else {
      el.innerHTML = `<section class="card"><h3>Admins only</h3></section>`;
    }
    return;
  }
  if (hash.startsWith("#/contact")) {
    mountContact?.(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
    return;
  }

  // default
  mountDashboard(el, { db, auth, user: CURRENT_USER, isAdmin: IS_ADMIN });
}

// Hash change → route
window.addEventListener("hashchange", () => {
  if (location.hash !== lastHash) renderRoute();
});

// auth → guard + render
watchAuth(async (user) => {
  CURRENT_USER = user || null;
  IS_ADMIN = user ? await isAdmin(user.uid) : false;

  // Admin link visible only for admins
  const adminLink = document.querySelector('[href="#/admin"]');
  if (adminLink) adminLink.style.display = IS_ADMIN ? "" : "none";

  if (CURRENT_USER && !location.hash) location.hash = "#/dashboard";
  renderRoute();
});

// First paint
document.addEventListener("DOMContentLoaded", route);
