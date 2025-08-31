// /public/js/firebase.js
import {
  initializeApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js";

const cfg = window.__FIREBASE_CONFIG;
if (!cfg) {
  throw new Error(
    "Missing window.__FIREBASE_CONFIG in index.html (put it before <script type='module' src='js/main.js'>)."
  );
}

const app = getApps().length ? getApps()[0] : initializeApp(cfg);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
