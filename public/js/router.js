import { app, auth, db, storage } from "./firebase.js";
export function router(onRoute) {
  function go() {
    onRoute(location.hash || "#/dashboard");
  }
  window.addEventListener("hashchange", go);
  go();
}
