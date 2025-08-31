// public/js/features/mylearning.js
import { col, ref } from "../core/fs-helpers.js";

// collection
const profiles = col("profiles"); // == collection(db,"profiles")
const chapters = col("courses", courseId, "chapters"); // == collection(db,"courses",courseId,"chapters")

// document
const me = ref("profiles", user.uid); // == doc(db,"profiles",user.uid)
import { db } from "../firebase.js";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// progress doc id = courseId
async function readProgress(uid, courseId) {
  const s = await getDoc(doc(db, "users", uid, "progress", courseId));
  return s.exists()
    ? s.data()
    : { completed: [], lastLessonId: null, percent: 0, updatedAt: null };
}
async function writeProgress(uid, courseId, patch) {
  await setDoc(
    doc(db, "users", uid, "progress", courseId),
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
async function toggleBookmark(uid, courseId, lessonId, on) {
  const id = `${courseId}__${lessonId}`;
  await setDoc(
    doc(db, "users", uid, "bookmarks", id),
    { on: !!on, courseId, lessonId, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
async function saveNote(uid, courseId, lessonId, text) {
  const id = `${courseId}__${lessonId}`;
  await setDoc(
    doc(db, "users", uid, "notes", id),
    { text: text || "", courseId, lessonId, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
async function readNote(uid, courseId, lessonId) {
  const id = `${courseId}__${lessonId}`;
  const s = await getDoc(doc(db, "users", uid, "notes", id));
  return s.exists() ? s.data().text || "" : "";
}

function progressBar(percent) {
  return `
    <div style="height:10px;border-radius:8px;background:#16214a;border:1px solid #2c3a66;overflow:hidden">
      <div style="width:${percent}%;height:100%;background:#1e90ff"></div>
    </div>
  `;
}

function parseHashCourse() {
  const m = location.hash.match(/course=([^&]+)/i);
  return m ? decodeURIComponent(m[1]) : null;
}

export function mountMyLearning(el, user) {
  el.innerHTML = `
    <section class="row" style="gap:12px; align-items:flex-start">
      <div class="card" style="min-width:260px; max-width:320px; flex:0 0 320px">
        <h3>My Courses</h3>
        <div id="my-courses">Loading…</div>
      </div>
      <div class="card" style="flex:1">
        <div id="player-head"></div>
        <div class="row" style="gap:12px; align-items:flex-start">
          <div id="lesson-list" style="min-width:260px; max-width:320px"></div>
          <div id="lesson-view" style="flex:1; min-height:320px"></div>
        </div>
      </div>
    </section>
  `;

  const myList = el.querySelector("#my-courses");
  const listEl = el.querySelector("#lesson-list");
  const viewEl = el.querySelector("#lesson-view");
  const headEl = el.querySelector("#player-head");

  let currentCourse = parseHashCourse();
  let lessons = [];
  let progress = { completed: [], lastLessonId: null, percent: 0 };

  function renderCourses(snap) {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (!rows.length) {
      myList.innerHTML = `<p class="muted">You haven't enrolled in any course yet.</p>`;
      return;
    }
    myList.innerHTML = rows
      .map(
        (r) => `
      <div class="card" style="background:#0b1634; cursor:pointer" data-course="${
        r.id
      }">
        <div class="row" style="gap:10px">
          <img src="${
            r.cover ||
            "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80"
          }" style="width:60px;height:42px;border-radius:8px;object-fit:cover" />
          <div>
            <b>${r.title || "Untitled"}</b>
            <div class="muted">${r.credit || 0} credits</div>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    // default course
    if (!currentCourse) currentCourse = rows[0].id;
    // select UI
    myList.querySelectorAll("[data-course]").forEach((it) => {
      it.onclick = () => {
        currentCourse = it.getAttribute("data-course");
        updateCourse();
      };
      if (it.getAttribute("data-course") === currentCourse)
        it.style.outline = "2px solid #1e90ff";
      else it.style.outline = "none";
    });
  }

  function renderHead() {
    headEl.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <h3 style="margin:0">Course Player</h3>
          <div class="muted">Track your progress, add bookmarks & notes.</div>
        </div>
        <div style="min-width:220px">${progressBar(progress.percent || 0)}</div>
      </div>
    `;
  }

  function renderLessons() {
    listEl.innerHTML = lessons.length
      ? lessons
          .map(
            (l) => `
      <div class="card" style="background:#0b1634;cursor:pointer" data-lesson="${
        l.id
      }">
        <div class="row" style="gap:8px">
          <span class="badge">${l.type || "text"}</span>
          <div><b>${l.title || "Lesson"}</b></div>
          ${
            progress.completed.includes(l.id)
              ? `<span class="badge">✓</span>`
              : ""
          }
        </div>
      </div>`
          )
          .join("")
      : `<p class="muted">No lessons yet.</p>`;

    listEl.querySelectorAll("[data-lesson]").forEach((it) => {
      it.onclick = () => openLesson(it.getAttribute("data-lesson"));
    });
  }

  async function openLesson(lessonId) {
    const lesson = lessons.find((x) => x.id === lessonId);
    if (!lesson) {
      viewEl.innerHTML = "<p>Lesson not found.</p>";
      return;
    }
    progress.lastLessonId = lessonId;
    await writeProgress(user.uid, currentCourse, progress);
    renderHead();

    // content
    let body = "";
    if ((lesson.type || "text") === "text") {
      body = `<div>${lesson.content || ""}</div>`;
    } else if (lesson.type === "video") {
      body = `<video controls style="width:100%;max-height:420px;border-radius:10px;border:1px solid #2c3a66">
        <source src="${
          lesson.mediaUrl ||
          "https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4"
        }" type="video/mp4"/>
      </video>`;
    } else if (lesson.type === "audio") {
      body = `<audio controls style="width:100%">
        <source src="${
          lesson.mediaUrl ||
          "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav"
        }" type="audio/wav"/>
      </audio>`;
    } else if (lesson.type === "quiz") {
      const q = (lesson.quiz && lesson.quiz[0]) || {
        question: "2 + 2 = ?",
        options: ["3", "4", "5"],
        answer: 1,
      };
      body = `
        <div><b>${q.question}</b></div>
        ${q.options
          .map(
            (o, i) => `
          <label class="row" style="gap:6px;margin-top:6px">
            <input type="radio" name="opt" value="${i}"/> ${o}
          </label>
        `
          )
          .join("")}
        <button class="btn primary" id="submit-quiz" style="margin-top:8px">Submit</button>
        <div id="quiz-result" class="muted" style="margin-top:6px"></div>
      `;
    } else if (lesson.type === "short") {
      body = `
        <label>Short answer</label>
        <textarea id="short-answer" rows="5" placeholder="Type here…"></textarea>
        <button class="btn primary" id="submit-short" style="margin-top:8px">Submit</button>
        <div id="short-result" class="muted" style="margin-top:6px"></div>
      `;
    }

    const noteValue = await readNote(user.uid, currentCourse, lessonId);
    viewEl.innerHTML = `
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
        <div><h3 style="margin:0">${lesson.title || "Lesson"}</h3></div>
        <div class="row" style="gap:6px">
          <button class="btn" id="btn-bookmark">Bookmark</button>
          <button class="btn primary" id="btn-complete">Mark complete</button>
        </div>
      </div>
      ${body}
      <div class="card" style="margin-top:12px;background:#0b1634">
        <label>My notes</label>
        <textarea id="note" rows="4" placeholder="Write your notes…">${
          noteValue || ""
        }</textarea>
        <div class="row" style="justify-content:flex-end;margin-top:6px">
          <button class="btn" id="save-note">Save note</button>
        </div>
      </div>
    `;

    // actions
    const bm = viewEl.querySelector("#btn-bookmark");
    bm.onclick = async () => {
      await toggleBookmark(user.uid, currentCourse, lessonId, true);
      bm.textContent = "Bookmarked ✓";
    };

    const done = viewEl.querySelector("#btn-complete");
    done.onclick = async () => {
      if (!progress.completed.includes(lessonId))
        progress.completed.push(lessonId);
      const pct = Math.round(
        (progress.completed.length / Math.max(1, lessons.length)) * 100
      );
      progress.percent = Math.min(100, pct);
      await writeProgress(user.uid, currentCourse, progress);
      renderLessons();
      renderHead();
      done.textContent = "Completed ✓";
    };

    const save = viewEl.querySelector("#save-note");
    save.onclick = async () => {
      const t = viewEl.querySelector("#note").value;
      await saveNote(user.uid, currentCourse, lessonId, t);
      save.textContent = "Saved ✓";
      setTimeout(() => (save.textContent = "Save note"), 800);
    };

    // quiz/short handlers
    const sq = viewEl.querySelector("#submit-quiz");
    if (sq) {
      sq.onclick = () => {
        const picked = viewEl.querySelector('input[name="opt"]:checked');
        const res = viewEl.querySelector("#quiz-result");
        const correct = (lesson.quiz && lesson.quiz[0]?.answer) ?? 1;
        if (!picked) {
          res.textContent = "Pick one option.";
          return;
        }
        res.textContent =
          Number(picked.value) === Number(correct) ? "Correct ✓" : "Try again.";
      };
    }
    const ss = viewEl.querySelector("#submit-short");
    if (ss) {
      ss.onclick = () => {
        const val = viewEl.querySelector("#short-answer").value.trim();
        viewEl.querySelector("#short-result").textContent = val
          ? "Submitted ✓"
          : "Type an answer.";
      };
    }
  }

  async function updateCourse() {
    if (!currentCourse) {
      listEl.innerHTML = "";
      viewEl.innerHTML = "<p>Select a course.</p>";
      return;
    }
    // load lessons (live)
    onSnapshot(
      query(
        collection(db, "courses", currentCourse, "lessons"),
        orderBy("order", "asc")
      ),
      async (snap) => {
        lessons = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        progress = await readProgress(user.uid, currentCourse);
        // recalc percent in case lessons count changed
        const pct = Math.round(
          (progress.completed.length / Math.max(1, lessons.length)) * 100
        );
        progress.percent = Math.min(100, pct);
        await writeProgress(user.uid, currentCourse, progress);
        renderHead();
        renderLessons();
        // open last or first
        const openId = progress.lastLessonId || lessons[0]?.id;
        if (openId) openLesson(openId);
      }
    );
    // highlight current in left list
    myList.querySelectorAll("[data-course]").forEach((it) => {
      it.style.outline =
        it.getAttribute("data-course") === currentCourse
          ? "2px solid #1e90ff"
          : "none";
    });
  }

  // my enrollments — live
  onSnapshot(collection(db, "users", user.uid, "enrollments"), (snap) => {
    renderCourses(snap);
    updateCourse();
  });
}
