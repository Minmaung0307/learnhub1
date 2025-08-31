import { app, auth, db, storage } from "../firebase.js";
export function initEmail(publicKey) {
  if (window.emailjs && publicKey) window.emailjs.init(publicKey);
}
