import { db, auth } from "../firebase.js";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const STATUSES = ["todo", "inprogress", "done"];

async function cleanupDone(uid) {
  const twoDays = Date.now() - 1000 * 60 * 60 * 24 * 2;
  const q = query(
    collection(db, "users", uid, "tasks"),
    where("status", "==", "done")
  );
  const snap = await getDocs(q);
  await Promise.all(
    snap.docs.map((d) => {
      const x = d.data();
      if (x.completedAt && x.completedAt < twoDays) return deleteDoc(d.ref);
    })
  );
}

export function mountTasks(el, user) {
  el.innerHTML = `
    <section class="row" style="gap:12px">
      <div class="card" style="flex:1"><h3>To Do</h3><div class="lane" data-status="todo"></div></div>
      <div class="card" style="flex:1"><h3>In Progress</h3><div class="lane" data-status="inprogress"></div></div>
      <div class="card" style="flex:1"><h3>Done</h3><div class="lane" data-status="done"></div></div>
    </section>
    <div class="row" style="margin-top:12px">
      <input id="task-title" placeholder="New task..." />
      <button class="btn primary" id="add-task">Add</button>
    </div>
  `;

  const lanes = el.querySelectorAll(".lane");
  lanes.forEach((l) => {
    l.addEventListener("dragover", (e) => e.preventDefault());
    l.addEventListener("drop", async (e) => {
      const id = e.dataTransfer.getData("text");
      const status = l.dataset.status;
      const ref = doc(db, "users", user.uid, "tasks", id);
      const patch = { status };
      if (status === "done") patch.completedAt = Date.now();
      await setDoc(ref, patch, { merge: true });
    });
  });

  el.querySelector("#add-task").onclick = async () => {
    const title = el.querySelector("#task-title").value.trim();
    if (!title) return;
    await addDoc(collection(db, "users", user.uid, "tasks"), {
      title,
      status: "todo",
      createdAt: Date.now(),
    });
    el.querySelector("#task-title").value = "";
  };

  // live
  STATUSES.forEach((st) => {
    const lane = el.querySelector(`.lane[data-status="${st}"]`);
    onSnapshot(collection(db, "users", user.uid, "tasks"), (snap) => {
      const items = snap.docs
        .filter((d) => d.data().status === st)
        .map((d) => {
          const x = d.data();
          return `<div class="task" draggable="true" data-id="${d.id}">
          <span>${x.title}</span>
          <button data-del="${d.id}" class="btn ghost" title="Delete">✕</button>
        </div>`;
        })
        .join("");
      lane.innerHTML = items || `<div class="muted">No ${st} tasks.</div>`;
      lane.querySelectorAll(".task").forEach((card) => {
        card.addEventListener("dragstart", (e) =>
          e.dataTransfer.setData("text", card.dataset.id)
        );
      });
      lane.querySelectorAll("[data-del]").forEach((btn) => {
        btn.onclick = () =>
          deleteDoc(doc(db, "users", user.uid, "tasks", btn.dataset.del));
      });
    });
  });

  cleanupDone(user.uid).catch(console.warn);
}
