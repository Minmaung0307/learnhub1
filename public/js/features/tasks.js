import { app, auth, db, storage } from "../firebase.js";
// /public/js/features/tasks.js
import { auth, db } from "../firebase.js";
import { col, ref } from "../core/fs-helpers.js";
import {
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

export async function mountTasks(container, user) {
  // Guard: user မလုပ်သေးငြင် အလုပ်မလုပ်
  if (!user) {
    container.innerHTML = `<p>Please sign in.</p>`;
    return;
  }

  container.innerHTML = `
    <section class="stack">
      <h2>Tasks (Drag & Drop)</h2>
      <div class="row gap">
        <input id="newTaskTitle" placeholder="New task…" />
        <button id="btnAddTask" class="btn primary">Add</button>
      </div>
      <div class="kanban">
        <div class="lane" data-status="todo"><h3>To Do</h3><div class="list" id="lane-todo"></div></div>
        <div class="lane" data-status="inprogress"><h3>In Progress</h3><div class="list" id="lane-inprogress"></div></div>
        <div class="lane" data-status="done"><h3>Done</h3><div class="list" id="lane-done"></div></div>
      </div>
    </section>
  `;

  const tasksCol = col("tasks"); // == collection(db,"tasks")

  // add
  container.querySelector("#btnAddTask").onclick = async () => {
    const title = container.querySelector("#newTaskTitle").value.trim();
    if (!title) return;
    await addDoc(tasksCol, {
      uid: user.uid,
      title,
      status: "todo",
      createdAt: Date.now(),
    });
    container.querySelector("#newTaskTitle").value = "";
  };

  // live read (only my tasks)
  const q = query(
    tasksCol,
    where("uid", "==", user.uid),
    orderBy("createdAt", "asc")
  );
  onSnapshot(q, (snap) => {
    const lanes = {
      todo: container.querySelector("#lane-todo"),
      inprogress: container.querySelector("#lane-inprogress"),
      done: container.querySelector("#lane-done"),
    };
    Object.values(lanes).forEach((el) => (el.innerHTML = ""));
    snap.forEach((docSnap) => {
      const t = docSnap.data();
      const card = document.createElement("div");
      card.className = "task-card";
      card.draggable = true;
      card.dataset.id = docSnap.id;
      card.innerHTML = `
        <div class="title">${t.title}</div>
        <div class="row gap mt-4">
          <button class="btn ghost" data-act="left">◀</button>
          <button class="btn ghost" data-act="right">▶</button>
          <button class="btn danger" data-act="del">🗑</button>
        </div>
      `;
      lanes[t.status || "todo"].appendChild(card);
    });
  });

  // simple move/delete
  container.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const card = btn.closest(".task-card");
    if (!card) return;
    const id = card.dataset.id;
    const act = btn.dataset.act;

    if (act === "del") {
      await deleteDoc(ref("tasks", id)); // == doc(db,"tasks",id)
      return;
    }
    // move left/right
    const next = {
      left: { todo: "todo", inprogress: "todo", done: "inprogress" },
      right: { todo: "inprogress", inprogress: "done", done: "done" },
    }[act];

    const lane = card.parentElement.id.replace("lane-", ""); // todo|inprogress|done
    const nextStatus = next[lane] || lane;
    await updateDoc(ref("tasks", id), {
      status: nextStatus,
      movedAt: Date.now(),
    });
  });
}
