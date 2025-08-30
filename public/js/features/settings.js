export function mountSettings(el) {
  el.innerHTML = `
    <section class="card" style="max-width:480px">
      <h3>Settings</h3>
      <label>Theme</label>
      <select id="theme">
        <option value="theme-default">Default</option>
        <option value="theme-teal">Teal</option>
        <option value="theme-purple">Purple</option>
      </select>
      <label style="margin-top:8px">Font size</label>
      <select id="font">
        <option value="fs-regular">Regular</option>
        <option value="fs-comfy">Comfy</option>
        <option value="fs-large">Large</option>
      </select>
    </section>
  `;
  const t = el.querySelector("#theme");
  const f = el.querySelector("#font");
  t.value = localStorage.getItem("theme") || "theme-default";
  f.value = localStorage.getItem("font") || "fs-regular";
  apply();
  t.onchange = f.onchange = apply;
  function apply() {
    const theme = t.value,
      font = f.value;
    document.body.classList.remove(
      "theme-default",
      "theme-teal",
      "theme-purple",
      "fs-regular",
      "fs-comfy",
      "fs-large"
    );
    document.body.classList.add(theme, font);
    localStorage.setItem("theme", theme);
    localStorage.setItem("font", font);
  }
}
