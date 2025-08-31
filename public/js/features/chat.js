import { app, auth, db, storage } from "../firebase.js";
import { db } from "../firebase.js";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function mountChat(el, user) {
  el.innerHTML = `
    <section class="card">
      <h3>Class Chat</h3>
      <div id="chat-box" style="max-height:320px; overflow:auto; border:1px solid #2c3a66; border-radius:10px; padding:8px; background:#0b1634"></div>
      <div class="row" style="margin-top:8px">
        <input id="msg" placeholder="Type a message…" />
        <button id="send" class="btn primary">Send</button>
      </div>
    </section>
  `;
  const box = el.querySelector("#chat-box");
  const q = query(
    collection(db, "rooms", "general", "messages"),
    orderBy("createdAt", "asc"),
    limit(200)
  );
  onSnapshot(q, (snap) => {
    box.innerHTML = snap.docs
      .map((d) => {
        const m = d.data();
        const who = m.displayName || m.uid?.slice(0, 6);
        return `<div class="row" style="gap:8px"><b>${who}</b><span class="muted">${
          m.text || ""
        }</span></div>`;
      })
      .join("");
    box.scrollTop = box.scrollHeight;
  });
  el.querySelector("#send").onclick = async () => {
    const i = el.querySelector("#msg");
    const text = i.value.trim();
    if (!text) return;
    await addDoc(collection(db, "rooms", "general", "messages"), {
      text,
      uid: user.uid,
      displayName: user.displayName || "Student",
      createdAt: serverTimestamp(),
    });
    i.value = "";
  };
}
