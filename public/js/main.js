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
import {
  getStorage,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

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
function setToday() {
  const el = document.getElementById("today");
  if (!el) return;
  const d = new Date();
  const fmt = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  el.textContent = fmt;
}
setToday();

// 5) Burger / Sidebar
document.getElementById("burger")?.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-open");
});

// 6) Logout (modular only)
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("Logout failed:", e);
  }
});

// 7) Live theme + font-size (Settings page buttons will have data-attrs)
function applyTheme(name) {
  if (!name) return;
  document.documentElement.dataset.theme = name;
  localStorage.setItem("lh_theme", name);
}
function applyFontScale(scale) {
  if (!scale) return;
  document.documentElement.style.setProperty("--font-scale", scale);
  localStorage.setItem("lh_font", scale);
}
// boot
applyTheme(localStorage.getItem("lh_theme") || "slate");
applyFontScale(localStorage.getItem("lh_font") || "1.0");

// delegate clicks for [data-theme]/[data-font]
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-theme]");
  if (t) applyTheme(t.dataset.theme);
  const f = e.target.closest("[data-font]");
  if (f) applyFontScale(f.dataset.font);
});

// 8) Global search → dispatch a custom event
document.getElementById("globalSearch")?.addEventListener("input", (e) => {
  const q = e.target.value?.trim() || "";
  window.dispatchEvent(new CustomEvent("app:search", { detail: { q } }));
});

// 9) Make sidebar links react instantly (no refresh needed)
document.querySelectorAll(".nav .nav-item").forEach((a) => {
  a.addEventListener("click", (ev) => {
    const target = a.getAttribute("href"); // "#/something"
    if (!target) return;
    ev.preventDefault();
    if (location.hash !== target) {
      location.hash = target;
    } else {
      // same route clicked → force re-mount
      route();
    }
    // mobile: close sidebar
    document.body.classList.remove("sidebar-open");
    // jump to top
    window.scrollTo({ top: 0, behavior: "auto" });
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

function mountLogin(el) {
  const tpl = document.getElementById("tpl-login");
  if (!tpl) {
    el.innerHTML = `<p>Login template missing.</p>`;
    return;
  }
  el.appendChild(tpl.content.cloneNode(true));

  const form = el.querySelector("#login-form");
  const btnSignup = el.querySelector("#btn-signup");
  const btnForgot = el.querySelector("#btn-forgot");

  btnSignup.onclick = async () => {
    const email = prompt("Email?");
    const pass = prompt("Password?");
    try {
      if (email && pass) {
        await createUserWithEmailAndPassword(auth, email, pass);
        alert("Account created. You are signed in.");
      }
    } catch (e) {
      alert(e.message || e);
    }
  };

  btnForgot.onclick = async () => {
    const email = prompt("Enter your email to reset password:");
    try {
      if (email) {
        await sendPasswordResetEmail(auth, email);
        alert("Reset email sent.");
      }
    } catch (e) {
      alert(e.message || e);
    }
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = el.querySelector("#login-email").value.trim();
    const pass = el.querySelector("#login-pass").value;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      alert(err.message || err);
    }
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
window.addEventListener("hashchange", route);

// Auth → user + role + UI
onAuthStateChanged(auth, async (user) => {
  CURRENT_USER = user || null;
  IS_ADMIN = user ? await isAdmin(user.uid) : false;

  // toggle Admin menu visibility
  const adminLink = document.querySelector('[href="#/admin"]');
  if (adminLink) adminLink.style.display = IS_ADMIN ? "" : "none";

  // avatar (if you have one in your header)
  const ava = document.getElementById("avatar");
  if (ava)
    ava.src =
      user?.photoURL ||
      "https://api.dicebear.com/7.x/thumbs/svg?seed=LearnHub";

  // jump to dashboard when logged in
  if (user && !location.hash) location.hash = "#/dashboard";

  route();
});

// First paint
document.addEventListener("DOMContentLoaded", route);