import { db } from "../firebase.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function mountAdmin(el) {
  el.innerHTML = `
    <section class="card">
      <h3>Admin Tools</h3>
      <button id="seed" class="btn primary">Seed Demo Data</button>
      <div id="seed-log" class="muted" style="margin-top:8px"></div>
      <div class="card" style="margin-top:12px">
        <h4>Guide</h4>
        <ul>
          <li>Roles: set <code>roles/{uid}.role = "admin"</code></li>
          <li>Tasks: DnD between lanes; Done auto-clean ≥ 2 days</li>
          <li>Chat: open group at <code>rooms/general/messages</code></li>
        </ul>
      </div>
    </section>
  `;
  el.querySelector("#seed").onclick = async () => {
    const log = el.querySelector("#seed-log");
    try {
      await setDoc(doc(db, "announcements", "welcome"), {
        title: "Welcome to LearnHub",
        body: "Demo data loaded. Explore dashboard, tasks and chat.",
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, "courses", "js101"), {
        title: "JavaScript 101",
        short: "Beginner JS",
        credit: 3,
        paid: false,
        cover:
          "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1200&q=80",
      });
      await setDoc(doc(db, "courses", "uiux"), {
        title: "UI/UX Essentials",
        short: "Design thinking basics",
        credit: 2,
        paid: true,
        cover:
          "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80",
      });
      log.textContent = "Seed completed ✅";
    } catch (e) {
      log.textContent = "Seed failed: " + e.message;
    }
  };
}
