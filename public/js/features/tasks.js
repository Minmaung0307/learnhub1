// public/js/features/tasks.js
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const db = getFirestore();

const LANES = [
  { key: "todo", title: "To Do" },
  { key: "inprogress", title: "In Progress" },
  { key: "done", title: "Done" },
];

function laneColumnHtml(l) {
  return `
    <section class="kanban-col" data-lane="${l.key}">
      <header class="row between">
        <h3>${l.title}</h3>
        ${
          l.key === "todo"
            ? `
          <button class="btn xs primary" data-action="addTask">
            <i class="ri-add-line"></i> Add
          </button>`
            : ``
        }
      </header>
      <div class="kanban-dropzone" data-lane="${l.key}"></div>
    </section>
  `;
}

export function mountTasks(root, user) {
  root.innerHTML = `
    <section class="page">
      <h2 class="mb-12">Tasks</h2>
      <div class="kanban grid-3 gap-12"></div>
    </section>
  `;
  const wrap = root.querySelector(".kanban");

  if (!user?.uid) {
    wrap.innerHTML = `<p class="muted">Please login to manage tasks.</p>`;
    return;
  }

  wrap.innerHTML = LANES.map(laneColumnHtml).join("");

  const tasksCol = collection(db, "users", user.uid, "tasks");

  // add task (in ToDo lane header)
  wrap
    .querySelector('[data-action="addTask"]')
    ?.addEventListener("click", async () => {
      const title = prompt("Task title?");
      if (!title) return;
      await addDoc(tasksCol, {
        title,
        status: "todo",
        createdAt: serverTimestamp(),
      });
    });

  // live query per-lane
  LANES.forEach(({ key }) => {
    const zone = wrap.querySelector(`.kanban-dropzone[data-lane="${key}"]`);
    const qy = query(
      tasksCol,
      where("status", "==", key),
      orderBy("createdAt", "desc")
    );
    onSnapshot(qy, (snap) => {
      zone.innerHTML = "";
      snap.forEach((d) => {
        const t = d.data();
        const card = document.createElement("article");
        card.className = "task-card";
        card.draggable = true;
        card.dataset.id = d.id;
        card.innerHTML = `
          <div class="row between">
            <strong>${t.title || "(untitled)"}</strong>
            <div class="row gap-6">
              <button class="icon btn xs" data-act="edit"><i class="ri-edit-2-line"></i></button>
              <button class="icon btn xs danger" data-act="del"><i class="ri-delete-bin-6-line"></i></button>
            </div>
          </div>
        `;
        // DnD
        card.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/task-id", d.id);
        });
        // edit
        card.querySelector('[data-act="edit"]').onclick = async () => {
          const title = prompt("Edit title:", t.title || "");
          if (title === null) return;
          await updateDoc(doc(tasksCol, d.id), { title });
        };
        // delete
        card.querySelector('[data-act="del"]').onclick = async () => {
          if (!confirm("Delete this task?")) return;
          await deleteDoc(doc(tasksCol, d.id));
        };
        zone.appendChild(card);
      });
    });
  });

  // Drop zones
  wrap.querySelectorAll(".kanban-dropzone").forEach((zone) => {
    zone.addEventListener("dragover", (e) => e.preventDefault());
    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/task-id");
      if (!id) return;
      const lane = zone.dataset.lane;
      const patch = { status: lane };
      if (lane === "done") patch.completedAt = serverTimestamp();
      await updateDoc(doc(tasksCol, id), patch);
    });
  });

  // Auto-prune Done after 2 days
  (async () => {
    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const qy = query(tasksCol, where("status", "==", "done"));
    const snap = await getDocs(qy);
    const batch = [];
    snap.forEach((d) => {
      const t = d.data();
      const ts =
        t.completedAt instanceof Timestamp ? t.completedAt.toDate() : null;
      if (ts && ts < cutoff) {
        batch.push(d.id);
      }
    });
    for (const id of batch) {
      await deleteDoc(doc(tasksCol, id));
    }
  })().catch(console.error);
}
