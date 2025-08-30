import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
export async function login(email, pass) {
  return signInWithEmailAndPassword(auth, email, pass);
}
export async function logout() {
  return signOut(auth);
}
export async function signup(email, pass, displayName = "Student") {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName) await updateProfile(cred.user, { displayName });
  await setDoc(
    doc(db, "users", cred.user.uid),
    {
      displayName,
      role: "student",
      createdAt: Date.now(),
    },
    { merge: true }
  );
  return cred;
}
export async function forgot(email) {
  return sendPasswordResetEmail(auth, email);
}

export async function isAdmin(uid) {
  const snap = await getDoc(doc(db, "roles", uid));
  return snap.exists() && snap.data().role === "admin";
}
