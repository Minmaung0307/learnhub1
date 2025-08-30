export function router(onRoute) {
  function go() {
    onRoute(location.hash || "#/dashboard");
  }
  window.addEventListener("hashchange", go);
  go();
}
