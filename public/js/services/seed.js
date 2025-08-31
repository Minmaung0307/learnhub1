import { app, auth, db, storage } from "../firebase.js";
// /public/js/services/seed.js
import { Router } from "../core/router.js";

// Uses compat OR modular depending on what you already loaded
async function getDb() {
  try {
    // modular
    const { getFirestore } = await import(
      "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js"
    );
    const { getApp } = await import(
      "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js"
    );
    return getFirestore(getApp());
  } catch {
    // compat
    return db;
  }
}

function uid() {
  return (
    Math.random().toString(36).slice(2, 8) + Date.now().toString(36)
  ).toUpperCase();
}

export async function seedAllDemo() {
  const db = await getDb();
  const me = await currentUser();
  if (!me) throw new Error("Sign in first");
  const isAdminRole = await checkAdmin(db, me.uid);
  if (!isAdmin) throw new Error("Admin only");

  // Collections to reset
  const targets = [
    "announcements",
    "courses",
    "chapters",
    "lessons",
    "tasks",
    "profiles",
    "certificates",
    "transcripts",
    "progress",
    "bookmarks",
  ];

  // Wipe old demo docs (simple client-side batch loop)
  for (const col of targets) {
    const snap = await db.collection(col).where("demo", "==", true).get();
    const batch = db.batch();
    snap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  // Announcements
  await db.collection("announcements").add({
    demo: true,
    title: "Welcome to LearnHub",
    body: "This is a demo announcement for admins and students.",
    createdAt: Date.now(),
  });

  // Courses (2 demo)
  const course1 = db.collection("courses").doc();
  const course2 = db.collection("courses").doc();
  await course1.set({
    demo: true,
    title: "Modern Web Dev (JS/HTML/CSS)",
    short: "Hands-on front-end fundamentals.",
    credit: 3,
    paid: false,
    cover:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&q=80&auto=format",
    createdAt: Date.now(),
  });
  await course2.set({
    demo: true,
    title: "Intro to Data Science",
    short: "From zero to pandas.",
    credit: 4,
    paid: true,
    price: 19,
    cover:
      "https://images.unsplash.com/photo-1517433456452-f9633a875f6f?w=1200&q=80&auto=format",
    createdAt: Date.now(),
  });

  // Chapters/Lessons for course1
  const ch1 = db.collection("chapters").doc();
  await ch1.set({
    demo: true,
    courseId: course1.id,
    order: 1,
    title: "Getting Started",
  });
  const ch2 = db.collection("chapters").doc();
  await ch2.set({
    demo: true,
    courseId: course1.id,
    order: 2,
    title: "Layout & Styles",
  });

  // Lessons with rich content (text/img/audio/video/quizzes/short answer)
  const lessons = [
    {
      chapterId: ch1.id,
      order: 1,
      type: "text",
      title: "Welcome & Setup",
      html: `<h2>Welcome</h2><p>Let’s configure your dev environment.</p>
            <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&auto=format" alt="">
            <ol><li>Install VS Code</li><li>Install Node.js LTS</li><li>Clone the starter</li></ol>`,
    },
    {
      chapterId: ch1.id,
      order: 2,
      type: "audio",
      title: "Key Concepts (Audio)",
      audio:
        "https://cdn.pixabay.com/download/audio/2021/11/30/audio_3a4b9e7a18.mp3?filename=study-ambient-10534.mp3",
      html: "<p>Listen and follow along with the slides.</p>",
    },
    {
      chapterId: ch1.id,
      order: 3,
      type: "video",
      title: "Flexbox Crash Course (Video)",
      video: "https://www.w3schools.com/html/mov_bbb.mp4",
      html: "<p>Short demo with sample video.</p>",
    },
    {
      chapterId: ch2.id,
      order: 1,
      type: "quiz",
      title: "Basics Quiz",
      quiz: [
        {
          q: "What does CSS stand for?",
          a: [
            "Cascading Style Sheets",
            "Creative Style System",
            "Computer Style Sheets",
          ],
          correct: 0,
        },
        {
          q: "Which tag defines a hyperlink?",
          a: ["<link>", "<a>", "<href>"],
          correct: 1,
        },
      ],
    },
    {
      chapterId: ch2.id,
      order: 2,
      type: "short",
      title: "Short Answer",
      prompt:
        "Explain the difference between margin and padding with a simple example.",
    },
  ];

  for (const l of lessons) {
    await db
      .collection("lessons")
      .add({ demo: true, courseId: course1.id, ...l });
  }

  // Tasks (kanban)
  const lists = ["todo", "inprogress", "done"];
  for (const list of lists) {
    for (let i = 0; i < 3; i++) {
      await db.collection("tasks").add({
        demo: true,
        uid: me.uid,
        title: `${list.toUpperCase()} task #${i + 1}`,
        list,
        createdAt: Date.now() - i * 86400000,
      });
    }
  }

  // Profile scaffold
  await db
    .collection("profiles")
    .doc(me.uid)
    .set(
      {
        demo: true,
        uid: me.uid,
        displayName: me.displayName || me.email,
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&q=80&auto=format",
        signature:
          "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=600&q=80&auto=format",
        credits: 3,
        score: 86,
      },
      { merge: true }
    );

  // Certificate & transcript (placeholders)
  await db.collection("certificates").doc(`${me.uid}_${course1.id}`).set({
    demo: true,
    uid: me.uid,
    courseId: course1.id,
    status: "ready",
    template: "landscape-basic",
  });
  await db
    .collection("transcripts")
    .doc(me.uid)
    .set({
      demo: true,
      uid: me.uid,
      items: [
        {
          courseId: course1.id,
          title: "Modern Web Dev",
          credit: 3,
          grade: "A-",
        },
        {
          courseId: course2.id,
          title: "Intro to Data Science",
          credit: 4,
          grade: "B+",
        },
      ],
    });

  // Progress & bookmarks (per-user)
  await db.collection("progress").doc(`${me.uid}_${course1.id}`).set({
    demo: true,
    uid: me.uid,
    courseId: course1.id,
    completedLessonIds: [],
    percent: 0,
  });
  await db.collection("bookmarks").doc(`${me.uid}_${course1.id}`).set({
    demo: true,
    uid: me.uid,
    courseId: course1.id,
    lessonIds: [],
  });

  return true;
}

// helpers
async function currentUser() {
  try {
    // modular
    const { getAuth, onAuthStateChanged } = await import(
      "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js"
    );
    const auth = getAuth();
    return new Promise((res) => onAuthStateChanged(auth, (u) => res(u)));
  } catch {
    // compat
    return new Promise((res) =>
      auth.onAuthStateChanged((u) => res(u))
    );
  }
}
async function checkAdmin(db, uid) {
  try {
    const doc = await db.collection("roles").doc(uid).get();
    return (doc.exists && doc.data()?.role === "admin") || false;
  } catch {
    return false;
  }
}
