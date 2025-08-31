import { app, auth, db, storage } from "../firebase.js";
import { db } from "../firebase.js";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function mountDashboard(el) {
  el.innerHTML = `
    <section class="row" style="gap:12px; flex-wrap:wrap">
      <div class="card" style="min-width:260px;flex:1">
        <h3>Announcements</h3>
        <div id="ann-list" class="vstack"></div>
      </div>
      <div class="card" style="min-width:260px;flex:1">
        <h3>Quick Stats</h3>
        <div id="quick-stats">Loading…</div>
      </div>
    </section>
  `;
  const q = query(
    collection(db, "announcements"),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  onSnapshot(q, (snap) => {
    const list = el.querySelector("#ann-list");
    list.innerHTML = snap.empty
      ? "<p>No announcements yet.</p>"
      : snap.docs
          .map(
            (d) =>
              `<div class="card" style="background:#0b1634"><b>${
                d.data().title || "Untitled"
              }</b><p>${d.data().body || ""}</p></div>`
          )
          .join("");
  });
  el.querySelector("#quick-stats").innerHTML = `
    <div>Welcome to LearnHub ✨</div>
    <div class="muted">This is your dashboard.</div>
  `;
}
