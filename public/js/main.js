import { app, auth, db, storage } from "./firebase.js";
// public/js/main.js  —— CLEAN SINGLE VERSION (no duplicate imports)
import {
  watchAuth,
  login,
  logout,
  signup,
  forgot,
  isAdmin as checkIsAdmin,
} from "./auth.js";

import { mountDashboard } from "./features/dashboard.js";
import { mountCourses } from "./features/courses.js";
import { mountMyLearning } from "./features/mylearning.js";
import { mountTasks } from "./features/tasks.js";
import { mountProfile } from "./features/profile.js";
import { mountChat } from "./features/chat.js";
import { mountSettings } from "./features/settings.js";
import { mountAdmin } from "./features/admin.js";
import { mountContact } from "./features/contact.js";

// ❗️IMPORTANT: REMOVE any other duplicate import blocks below this line.
//    There should be only one set of imports in this file.

const outlet = document.getElementById("app");

// Today (topbar)
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

// Sidebar burger (mobile)
document.getElementById("burger")?.addEventListener("click", () => {
  document.body.classList.toggle("sidebar-open");
});

// Logout (top-right icon)
document.getElementById("btnLogout")?.addEventListener("click", async () => {
  try {
    await logout();
  } catch (e) {
    console.error("Logout failed", e);
  }
});

// Theme + font-size (instant)
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

// Global search (broadcast simple event)
document.getElementById("globalSearch")?.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  window.dispatchEvent(new CustomEvent("app:search", { detail: { q } }));
});

// ------ Router (hash-based) ------
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

let CURRENT_USER = null;
let IS_ADMIN = false;
let lastHash = null;

function renderRoute() {
  const hash = (location.hash || "#/dashboard").toLowerCase();
  if (!outlet) return;

  outlet.innerHTML = "";
  const host = document.createElement("div");
  outlet.appendChild(host);

  if (!CURRENT_USER) {
    mountLogin(host);
    lastHash = hash;
    return;
  }

  // keep admin nav visible only for admins
  const adminLink = document.querySelector('[href="#/admin"]');
  if (adminLink) adminLink.style.display = IS_ADMIN ? "" : "none";

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

// Sidebar clicks → hash change (instant render)
document.querySelectorAll(".nav .nav-item").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    const to = a.getAttribute("href");
    if (to && to !== location.hash) location.hash = to;
  });
});

// hashchange → render (no refresh needed)
window.addEventListener("hashchange", () => {
  if (location.hash !== lastHash) renderRoute();
});

// auth → guard + initial render
watchAuth(async (user) => {
  CURRENT_USER = user || null;
  IS_ADMIN = user ? await checkIsAdmin(user.uid) : false;

  if (CURRENT_USER && !location.hash) location.hash = "#/dashboard";
  renderRoute();
});
