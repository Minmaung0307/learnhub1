// public/js/features/profile.js
import { auth, db, storage } from "../firebase.js";
import {
  doc,
  getDocs,
  collection,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

async function loadAgg(uid) {
  const enr = await getDocs(collection(db, "users", uid, "enrollments"));
  let credits = 0;
  enr.forEach((d) => (credits += d.data().credit || 0));

  const prog = await getDocs(collection(db, "users", uid, "progress"));
  let pctAvg = 0,
    n = 0;
  prog.forEach((d) => {
    pctAvg += d.data().percent || 0;
    n++;
  });
  pctAvg = n ? Math.round(pctAvg / n) : 0;

  return {
    credits,
    avgProgress: pctAvg,
    courses: enr.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
}

async function ensureJsPDF() {
  if (window.jspdf) return window.jspdf;
  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.jspdf;
}

function makeCertificate(doc, user, agg) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  pdf.setFillColor("#0f1830");
  pdf.rect(0, 0, 842, 595, "F");
  pdf.setTextColor("#e8eeff");
  pdf.setFontSize(26);
  pdf.text("Certificate of Completion", 421, 120, { align: "center" });
  pdf.setFontSize(18);
  pdf.text(`This certifies that`, 421, 170, { align: "center" });
  pdf.setFontSize(30);
  pdf.text(user.displayName || user.email, 421, 220, { align: "center" });
  pdf.setFontSize(16);
  pdf.text(`has successfully completed courses on LearnHub`, 421, 260, {
    align: "center",
  });

  pdf.setFontSize(14);
  const list = agg.courses
    .map((c) => `${c.title || c.courseId} (${c.credit || 0} credits)`)
    .slice(0, 6);
  list.forEach((line, i) =>
    pdf.text(line, 421, 310 + i * 22, { align: "center" })
  );

  pdf.setFontSize(12);
  pdf.text(`Total Credits: ${agg.credits}`, 80, 530);
  pdf.text(`Average Progress: ${agg.avgProgress}%`, 80, 550);
  pdf.text(new Date().toLocaleDateString(), 762, 550, { align: "right" });
  pdf.save("certificate.pdf");
}

function makeTranscript(doc, user, agg) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  pdf.setFillColor("#0f1830");
  pdf.rect(0, 0, 595, 842, "F");
  pdf.setTextColor("#e8eeff");
  pdf.setFontSize(22);
  pdf.text("Official Transcript", 298, 80, { align: "center" });
  pdf.setFontSize(14);
  pdf.text(`Name: ${user.displayName || user.email}`, 60, 120);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 60, 140);

  // table-ish
  let y = 180;
  pdf.setFont(undefined, "bold");
  pdf.text("Course", 60, y);
  pdf.text("Credits", 420, y);
  pdf.text("Progress", 500, y);
  pdf.setFont(undefined, "normal");
  y += 18;
  agg.courses.forEach((c) => {
    pdf.text(`${c.title || c.courseId}`, 60, y);
    pdf.text(String(c.credit || 0), 420, y);
    // percent from progress collection is not joined here; keep blank or average
    pdf.text("-", 500, y);
    y += 18;
  });
  y += 10;
  pdf.text(`Total Credits: ${agg.credits}`, 60, y);
  pdf.save("transcript.pdf");
}

export function mountProfile(el, user) {
  el.innerHTML = `
    <section class="row" style="gap:12px; align-items:flex-start">
      <div class="card" style="min-width:280px; max-width:340px">
        <h3>Profile</h3>
        <div class="row" style="gap:10px">
          <img id="pf-avatar" src="${
            user.photoURL || "https://api.dicebear.com/7.x/thumbs/svg?seed=LH"
          }" class="avatar" style="width:64px;height:64px;border-radius:50%" />
          <div>
            <div><b>${user.displayName || user.email}</b></div>
            <div class="muted">${user.email}</div>
          </div>
        </div>
        <div style="margin-top:10px">
          <label>Upload avatar</label>
          <input type="file" id="file" accept="image/*"/>
          <button class="btn" id="save-avatar" style="margin-top:6px">Save Avatar</button>
        </div>
        <div class="row" style="gap:8px;margin-top:10px">
          <button class="btn" id="btn-cert">Download Certificate</button>
          <button class="btn" id="btn-trans">Download Transcript</button>
        </div>
      </div>
      <div class="card" style="flex:1">
        <h3>Stats</h3>
        <div id="stats">Loading…</div>
      </div>
    </section>
  `;

  // avatar upload
  el.querySelector("#save-avatar").onclick = async () => {
    const f = el.querySelector("#file").files?.[0];
    if (!f) return alert("Choose a file.");
    const r = ref(storage, `users/${user.uid}/avatar-${Date.now()}`);
    await uploadBytes(r, f);
    const url = await getDownloadURL(r);
    await updateProfile(auth.currentUser, { photoURL: url });
    el.querySelector("#pf-avatar").src = url;
    alert("Avatar updated.");
  };

  // stats & PDFs
  loadAgg(user.uid).then(async (agg) => {
    el.querySelector("#stats").innerHTML = `
      <div class="row" style="gap:12px;flex-wrap:wrap">
        <div class="card" style="min-width:180px;background:#0b1634"><b>Credits</b><div style="font-size:28px">${agg.credits}</div></div>
        <div class="card" style="min-width:180px;background:#0b1634"><b>Avg Progress</b><div style="font-size:28px">${agg.avgProgress}%</div></div>
      </div>
    `;
    await ensureJsPDF();
    el.querySelector("#btn-cert").onclick = () =>
      makeCertificate(window.jspdf, user, agg);
    el.querySelector("#btn-trans").onclick = () =>
      makeTranscript(window.jspdf, user, agg);
  });
}
