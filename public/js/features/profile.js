import { app, auth, db, storage } from "../firebase.js";
// public/js/features/profile.js
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const db = getFirestore();

async function loadAgg(uid) {
  if (!uid) return { scores: 0, credits: 0, certs: 0, finals: 0 };
  // attempts (scores, credits)
  let scores = 0,
    credits = 0;
  const attCol = collection(db, "users", uid, "attempts");
  const attSnap = await getDocs(attCol);
  attSnap.forEach((d) => {
    const a = d.data();
    scores += Number(a.score || 0);
    credits += Number(a.credit || 0);
  });
  // certs/finals (just counts for demo)
  const certCol = collection(db, "users", uid, "certificates");
  const finCol = collection(db, "users", uid, "finals");
  const certs = (await getDocs(certCol)).size;
  const finals = (await getDocs(finCol)).size;

  return { scores, credits, certs, finals };
}

export async function mountProfile(root, user) {
  root.innerHTML = `<section class="page"><h2>Profile</h2><div id="prof"></div></section>`;
  const host = root.querySelector("#prof");
  if (!user?.uid) {
    host.innerHTML = `<p class="muted">Please login.</p>`;
    return;
  }
  const profRef = doc(db, "profiles", user.uid);
  const prof = (await getDoc(profRef)).data() || {};
  const agg = await loadAgg(user.uid);

  host.innerHTML = `
    <div class="grid-2 gap-16">
      <section class="card">
        <header class="row between"><h3>Account</h3></header>
        <div class="row gap-12 center">
          <img class="avatar xl" src="${
            user.photoURL || "https://api.dicebear.com/7.x/thumbs/svg?seed=LH"
          }" alt="" />
          <div>
            <div><strong>${
              prof.displayName || user.displayName || user.email
            }</strong></div>
            <div class="muted">${user.email}</div>
          </div>
        </div>
        <div class="mt-12 row gap">
          <button class="btn" id="viewCard"><i class="ri-id-card-line"></i> View Card</button>
        </div>
      </section>

      <section class="card">
        <header><h3>Stats</h3></header>
        <ul class="list">
          <li>Scores: <strong>${agg.scores}</strong></li>
          <li>Credits: <strong>${agg.credits}</strong></li>
          <li>Certificates: <strong>${agg.certs}</strong></li>
          <li>Finals: <strong>${agg.finals}</strong></li>
        </ul>
      </section>
    </div>
  `;

  host.querySelector("#viewCard")?.addEventListener("click", () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <style>
        body{font-family: Inter, system-ui; padding:24px}
        .card{border:1px solid #e5e7eb; padding:20px; border-radius:12px; width:480px}
        .row{display:flex; gap:12px; align-items:center}
        .muted{color:#6b7280}
        img{width:64px;height:64px;border-radius:50%}
      </style>
      <div class="card">
        <div class="row">
          <img src="${
            user.photoURL || "https://api.dicebear.com/7.x/thumbs/svg?seed=LH"
          }" />
          <div>
            <h2 style="margin:0">LearnHub – Student Card</h2>
            <div class="muted">${user.email}</div>
          </div>
        </div>
        <p style="margin-top:16px">Scores: ${agg.scores} | Credits: ${
      agg.credits
    }</p>
      </div>
    `);
    win.document.close();
  });
}
