// Remembers a tool's settings in localStorage, so they are still there after closing and reopening the page.
// Load it (without defer) before the tool's own script, then call at the end of that script:
//   AGSettings.persist("swing", {
//     controls: ["color", "size"],         // ids of inputs/selects, restored in this order
//     get: () => ({ showRope }),            // optional: extra state that lives in variables
//     set: (saved) => { ... },              // optional: puts that extra state back
//   });
// Restored controls fire "input" and "change", so the tool reacts as if the user moved them.
// Images, videos and drawings are not stored, only the settings.
(function () {
  "use strict";

  const PREFIX = "ag-settings:";

  function read(key) {
    try {
      const value = JSON.parse(localStorage.getItem(PREFIX + key) || "null");
      return value && typeof value === "object" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      // Storage blocked or full: the tool keeps working, it just forgets.
    }
  }

  function readControl(el) {
    return el.type === "checkbox" ? el.checked : el.value;
  }

  // Only accepts values the control can really take, so old or broken data never breaks a tool.
  function applyControl(el, value) {
    if (el.type === "checkbox") {
      if (typeof value !== "boolean" || el.checked === value) return;
      el.checked = value;
    } else {
      if (typeof value !== "string" || el.value === value) return;
      if (el.tagName === "SELECT" && !Array.from(el.options).some((option) => option.value === value)) return;
      if (el.type === "color" && !/^#[0-9a-f]{6}$/i.test(value)) return;
      if ((el.type === "range" || el.type === "number") && !Number.isFinite(parseFloat(value))) return;
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function persist(key, options) {
    options = options || {};
    const controls = (options.controls || []).map((id) => document.getElementById(id)).filter(Boolean);
    const saved = read(key);

    if (saved) {
      const values = saved.controls || {};
      controls.forEach((el) => {
        if (Object.prototype.hasOwnProperty.call(values, el.id)) applyControl(el, values[el.id]);
      });
      if (options.set && saved.state && typeof saved.state === "object") {
        try {
          options.set(saved.state);
        } catch (error) {
          console.warn("Could not restore saved settings", error);
        }
      }
    }

    function save() {
      const values = {};
      controls.forEach((el) => {
        values[el.id] = readControl(el);
      });
      write(key, { controls: values, state: options.get ? options.get() : undefined });
    }

    // Save shortly after any interaction, once the tool's own handlers have run.
    let timer = 0;
    function scheduleSave() {
      clearTimeout(timer);
      timer = setTimeout(save, 200);
    }
    ["input", "change", "click", "pointerup"].forEach((type) => document.addEventListener(type, scheduleSave, true));
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") save();
    });

    return { save };
  }

  window.AGSettings = { persist, read, write };
})();
