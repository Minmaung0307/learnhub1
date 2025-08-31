import { app, auth, db, storage } from "../firebase.js";
export async function ensurePayPal(clientId) {
  if (window.paypal) return window.paypal;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=USD`;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.paypal;
}
