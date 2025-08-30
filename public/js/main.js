import { app, auth } from "./firebase.js";
import { router } from "./router.js";
import { watchAuth, login, logout, signup, forgot, isAdmin } from "./auth.js";
import { mountDashboard } from "./features/dashboard.js";
import { mountTasks } from "./features/tasks.js";
import { mountChat } from "./features/chat.js";
import { mountSettings } from "./features/settings.js";
import { mountAdmin } from "./features/admin.js";
import { initEmail } from "./services/email.js";
import { mountCourses } from "./features/courses.js";
import { mountMyLearning } from "./features/mylearning.js";
import { mountProfile } from "./features/profile.js";
import { mountContact } from "./features/contact.js";

// Init EmailJS
initEmail(window.__EMAILJS_CONFIG?.publicKey);

// Today
document.getElementById("today").textContent = new Date().toLocaleDateString();

// Mobile burger
const burger = document.getElementById("burger");
burger?.addEventListener("click", () =>
  document.body.classList.toggle("sidebar-open")
);

// Logout
document
  .querySelector('[data-action="logout"]')
  ?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

// Router
const outlet = document.getElementById("app");
function mount(hash, user, admin) {
  outlet.innerHTML = ""; // reset
  const el = document.createElement("div");
  outlet.appendChild(el);

  const route = (hash || "").toLowerCase();
  if (!user) {
    mountLogin(el);
    return;
  }
  switch (true) {
    case route.startsWith("#/dashboard"):
      mountDashboard(el);
      break;

    case route.startsWith("#/courses"):
      mountCourses(el, user);
      break;

    case route.startsWith("#/mylearning"):
      mountMyLearning(el, user);
      break;

    case route.startsWith("#/profile"):
      mountProfile(el, user);
      break;

    case route.startsWith("#/tasks"):
      mountTasks(el, user);
      break;

    case route.startsWith("#/chat"):
      mountChat(el, user);
      break;

    case route.startsWith("#/contact"):
      mountContact(el);
      break;

    case route.startsWith("#/settings"):
      mountSettings(el);
      break;

    case route.startsWith("#/admin"):
      admin ? mountAdmin(el) : (el.innerHTML = "<p>Admins only.</p>");
      break;

    default:
      mountDashboard(el);
  }
}

function mountLogin(el) {
  const tpl = document.getElementById("tpl-login").content.cloneNode(true);
  el.appendChild(tpl);
  const form = el.querySelector("#login-form");
  el.querySelector("#btn-signup").onclick = async () => {
    const email = prompt("Email?");
    const pass = prompt("Password?");
    if (email && pass) await signup(email, pass, email.split("@")[0]);
  };
  el.querySelector("#btn-forgot").onclick = async () => {
    const email = prompt("Enter your email to reset password:");
    if (email) await forgot(email);
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = el.querySelector("#login-email").value.trim();
    const pass = el.querySelector("#login-pass").value;
    await login(email, pass);
  };
}

// Auth → route & avatar
let lastHash = null;
watchAuth(async (user) => {
  const admin = user ? await isAdmin(user.uid) : false;
  const ava = document.getElementById("avatar");
  if (ava)
    ava.src =
      user?.photoURL || "https://api.dicebear.com/7.x/thumbs/svg?seed=LH";
  // keep admin link clickable; hide if not admin
  const adminLink = document.querySelector('[href="#/admin"]');
  if (adminLink) adminLink.style.display = admin ? "" : "none";

  if (location.hash === "" && user) location.hash = "#/dashboard";
  lastHash = location.hash;
  mount(location.hash, user, admin);
});
router((hash) => {
  if (hash === lastHash) return;
  lastHash = hash;
  // user will be read in watchAuth callback; nothing else here
});

// Global search (simple demo)
document.getElementById("global-search")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") alert("Search: " + e.currentTarget.value);
});
