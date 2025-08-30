// public/js/features/courses.js
import { db, auth } from "../firebase.js";
import {
  collection,
  getDocs,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ensurePayPal } from "../services/paypal.js";

function cardTemplate(c, enrolled) {
  const btn = enrolled
    ? `<button class="btn primary" data-goto="${c.id}">Go to course</button>`
    : c.paid
    ? `<div id="pp-${c.id}" class="paypal-slot"></div>`
    : `<button class="btn primary" data-enroll-free="${c.id}">Enroll (Free)</button>`;

  return `
  <div class="card course-card">
    <div class="row" style="gap:14px; align-items:flex-start">
      <img src="${
        c.cover ||
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80"
      }" alt="${
    c.title
  }" style="width:120px;height:80px;object-fit:cover;border-radius:10px;border:1px solid #2c3a66" />
      <div style="flex:1">
        <h3 style="margin:0 0 4px">${c.title || "Untitled"}</h3>
        <div class="muted" style="margin-bottom:8px">${c.short || ""}</div>
        <div class="row" style="gap:10px;flex-wrap:wrap">
          <span class="badge">${c.paid ? "Paid" : "Free"}</span>
          <span class="badge">Credit: ${c.credit || 0}</span>
          ${c.benefits ? `<span class="badge">${c.benefits}</span>` : ""}
        </div>
      </div>
      <div style="min-width:180px">${btn}</div>
    </div>
  </div>
  `;
}

async function loadEnrollments(uid) {
  const snap = await getDocs(collection(db, "users", uid, "enrollments"));
  const set = new Set();
  snap.forEach((d) => set.add(d.id));
  return set;
}

async function enrollFree(uid, course) {
  const enrRef = doc(db, "users", uid, "enrollments", course.id);
  await setDoc(
    enrRef,
    {
      courseId: course.id,
      title: course.title,
      credit: course.credit || 0,
      paid: !!course.paid,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function mountPayPalButton(slotEl, user, course) {
  const clientId = window.__PAYPAL_CLIENT_ID;
  if (!clientId) {
    slotEl.innerHTML = `<div class="muted">PayPal client id missing.</div>`;
    return;
  }
  ensurePayPal(clientId)
    .then((paypal) => {
      paypal
        .Buttons({
          style: { layout: "horizontal", tagline: false },
          createOrder: (data, actions) => {
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    currency_code: "USD",
                    value: course.price || "10.00",
                  },
                  description: `${course.title} (LearnHub)`,
                },
              ],
            });
          },
          onApprove: async (data, actions) => {
            const details = await actions.order.capture();
            // record enrollment + payment
            await enrollFree(user.uid, course);
            await setDoc(doc(db, "users", user.uid, "payments", data.orderID), {
              orderId: data.orderID,
              courseId: course.id,
              amount: details.purchase_units?.[0]?.amount?.value || null,
              raw: details,
              createdAt: serverTimestamp(),
            });
            // goto course
            location.hash = `#/mylearning?course=${encodeURIComponent(
              course.id
            )}`;
          },
          onError: (err) => {
            slotEl.innerHTML = `<div class="muted">Payment error: ${
              err?.message || err
            }</div>`;
          },
        })
        .render(slotEl);
    })
    .catch((e) => {
      slotEl.innerHTML = `<div class="muted">PayPal load failed: ${
        e?.message || e
      }</div>`;
    });
}

export function mountCourses(el, user) {
  el.innerHTML = `
    <section class="card">
      <h3>Courses</h3>
      <div class="row" style="gap:8px;margin-bottom:10px">
        <input id="q" placeholder="Search courses…" style="max-width:360px"/>
        <select id="filter">
          <option value="all">All</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
          <option value="enrolled">My Enrolled</option>
        </select>
      </div>
      <div id="course-list"></div>
    </section>
  `;

  const listEl = el.querySelector("#course-list");
  const qInput = el.querySelector("#q");
  const fSel = el.querySelector("#filter");

  let courses = [];
  let myEnroll = new Set();

  async function refresh() {
    let rows = courses;

    const qv = (qInput.value || "").toLowerCase();
    if (qv) {
      rows = rows.filter(
        (c) =>
          (c.title || "").toLowerCase().includes(qv) ||
          (c.short || "").toLowerCase().includes(qv)
      );
    }
    const fv = fSel.value;
    if (fv === "free") rows = rows.filter((c) => !c.paid);
    if (fv === "paid") rows = rows.filter((c) => c.paid);
    if (fv === "enrolled") rows = rows.filter((c) => myEnroll.has(c.id));

    if (!rows.length) {
      listEl.innerHTML = `<p class="muted">No courses.</p>`;
      return;
    }

    listEl.innerHTML = rows
      .map((c) => cardTemplate(c, myEnroll.has(c.id)))
      .join("");

    // wire buttons
    listEl.querySelectorAll("[data-goto]").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-goto");
        location.hash = `#/mylearning?course=${encodeURIComponent(id)}`;
      };
    });
    listEl.querySelectorAll("[data-enroll-free]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-enroll-free");
        const course = courses.find((x) => x.id === id);
        await enrollFree(user.uid, course);
        refresh();
      };
    });
    // PayPal
    listEl.querySelectorAll(".paypal-slot").forEach((slot) => {
      const id = slot.id.replace("pp-", "");
      const course = courses.find((x) => x.id === id);
      if (course && !myEnroll.has(id)) mountPayPalButton(slot, user, course);
    });
  }

  // my enrollments once
  loadEnrollments(user.uid).then((set) => {
    myEnroll = set;
    refresh();
  });

  // live courses
  const q = query(collection(db, "courses"), orderBy("title", "asc"));
  onSnapshot(q, (snap) => {
    courses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    refresh();
  });

  qInput.oninput = refresh;
  fSel.onchange = refresh;
}
