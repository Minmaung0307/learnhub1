// /public/js/core/router.js
// ES module
export const Router = (() => {
  const routes = {};
  const getRoot = () => document.querySelector("#app"); // main outlet
  const ensureTop = () => {
    const scroller = document.querySelector(".main") || window;
    scroller.scrollTo({ top: 0, behavior: "instant" });
  };

  function register(path, loaderFn) {
    routes[path] = loaderFn;
  }

  async function navigate(path, state = {}) {
    const target = path.startsWith("/") ? path : `/${path}`;
    if (location.hash !== `#${target}`) {
      history.pushState(state, "", `#${target}`);
    }

    // Small screens: auto-collapse after click
    if (window.innerWidth < 1024) {
      document.documentElement.classList.add("sidebar-collapsed");
    }

    const root = getRoot();
    if (!root) return console.warn("[Router] #app not found");

    root.innerHTML = `
      <div class="vh-center" style="height: calc(100dvh - 80px);">
        <div class="spinner"></div>
      </div>`;

    try {
      const render = routes[target];
      if (typeof render === "function") {
        await render(root, state);
      } else if (routes["/404"]) {
        await routes["/404"](root, state);
      } else {
        root.innerHTML = `<div class="p-24">Route not found: <code>${target}</code></div>`;
      }
    } catch (err) {
      console.error("[Router] render error", err);
      root.innerHTML = `
        <div class="p-24">
          <h2>Oops — rendering failed</h2>
          <pre class="code">${String(err?.message || err)}</pre>
        </div>`;
    }
    ensureTop();
  }

  function start(defaultPath = "/dashboard") {
    // In-app navigation interception
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-route]");
      if (!link) return;
      const path = link.getAttribute("data-route");
      if (!path) return;
      e.preventDefault();
      navigate(path);
    });

    // Hash / popstate support
    const go = () => navigate((location.hash || "").slice(1) || defaultPath);
    window.addEventListener("hashchange", go);
    window.addEventListener("popstate", go);
    go();
  }

  return { register, navigate, start };
})();
