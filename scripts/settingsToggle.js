// Hide / show an app's settings panel with one button (or the H key), so the canvas gets the room.
// Each app includes this script with the panel's selector:
//   <script defer src="../scripts/settingsToggle.js" data-panel="#controls"></script>
// The button sits in the panel's top-right corner, or on its own row at the top of the panel when
// something is under that corner; while hidden a "Settings" button takes the panel's top-left corner.
// An element with [data-settings-toggle-slot] inside the panel holds the Hide button instead.
// The choice is remembered per app.
(function () {
  "use strict";

  const script = document.currentScript;
  const panelSelector = (script && script.dataset.panel) || "#controls";
  const storageKey = `ag-settings-hidden:${location.pathname}`;

  function readHidden() {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch (error) {
      return false;
    }
  }

  function saveHidden(hidden) {
    try {
      localStorage.setItem(storageKey, hidden ? "1" : "0");
    } catch (error) {
      // Only a convenience; the toggle still works.
    }
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .ag-settings-collapsed { display: none !important; }
      /* Doubled class and element: wins over the apps' own button styles. */
      body button.ag-settings-toggle.ag-settings-toggle {
        position: absolute;
        z-index: 4000;
        width: auto !important;
        min-width: 0;
        box-shadow: none;
        transform: none;
        margin: 0;
        padding: 0 14px;
        border: 1px solid var(--ag-toggle-border, rgba(255, 255, 255, 0.45));
        border-radius: 0;
        background: var(--ag-toggle-bg, #000);
        color: var(--ag-toggle-fg, #fff);
        font: inherit;
        font-size: 11px;
        line-height: 1;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        white-space: nowrap;
        cursor: pointer;
      }
      body button.ag-settings-toggle.is-in-slot { position: static; }
      .ag-settings-toggle-row { display: flex; justify-content: flex-end; align-self: stretch; width: 100%; margin-bottom: 4px; }
      body button.ag-settings-toggle[hidden] { display: none !important; }
      body button.ag-settings-toggle.ag-settings-toggle:hover { border-color: var(--ag-toggle-fg, #fff); }
      body button.ag-settings-toggle:focus-visible { outline: 2px solid #2997ff; outline-offset: 2px; }
    `;
    document.head.appendChild(style);
  }

  function isTyping(target) {
    if (!target || !target.tagName) {
      return false;
    }
    if (target.isContentEditable || ["TEXTAREA", "SELECT"].includes(target.tagName)) {
      return true;
    }
    return target.tagName === "INPUT" && !["range", "checkbox", "radio", "color", "file", "button"].includes(target.type);
  }

  function start() {
    const panel = document.querySelector(panelSelector);
    if (!panel) {
      return;
    }
    injectStyles();
    if (!panel.id) {
      panel.id = "appSettingsPanel";
    }

    const hideButton = document.createElement("button");
    hideButton.type = "button";
    hideButton.className = "ag-settings-toggle";
    hideButton.textContent = "Hide";
    hideButton.title = "Hide settings (H)";
    hideButton.setAttribute("aria-controls", panel.id);
    hideButton.setAttribute("aria-expanded", "true");

    const showButton = document.createElement("button");
    showButton.type = "button";
    showButton.className = "ag-settings-toggle";
    showButton.textContent = "Settings";
    showButton.title = "Show settings (H)";
    showButton.setAttribute("aria-controls", panel.id);
    showButton.setAttribute("aria-expanded", "false");
    showButton.hidden = true;

    let slot = panel.querySelector("[data-settings-toggle-slot]");
    if (slot) {
      hideButton.classList.add("is-in-slot");
      slot.appendChild(hideButton);
    } else {
      document.body.appendChild(hideButton);
    }
    document.body.appendChild(showButton);

    // When the panel's top-right corner has content under it (a long title), the button gets its own
    // row at the top of the panel instead of covering that content.
    const moveIntoRowIfCovering = () => {
      if (slot) {
        return;
      }
      const box = hideButton.getBoundingClientRect();
      const covers = Array.from(panel.querySelectorAll("*")).some((element) => {
        const isContent = !element.children.length || /^(H\d|P|LABEL|BUTTON|INPUT|SELECT|IMG|CANVAS|VIDEO)$/.test(element.tagName);
        if (!isContent || !element.getClientRects().length) {
          return false;
        }
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top;
      });
      if (covers) {
        slot = document.createElement("div");
        slot.className = "ag-settings-toggle-row";
        hideButton.classList.add("is-in-slot");
        hideButton.style.top = "";
        hideButton.style.left = "";
        slot.appendChild(hideButton);
        panel.insertBefore(slot, panel.firstChild);
      }
    };

    // Where the panel sits, in page coordinates (kept from the last time it was visible).
    let lastBox = null;
    const place = () => {
      if (!panel.classList.contains("ag-settings-collapsed")) {
        const rect = panel.getBoundingClientRect();
        if (rect.width && rect.height) {
          lastBox = { top: rect.top + window.scrollY, left: rect.left + window.scrollX, right: rect.right + window.scrollX };
        }
      }
      if (!lastBox) {
        return;
      }
      if (!slot) {
        hideButton.style.top = `${lastBox.top + 6}px`;
        hideButton.style.left = `${lastBox.right - hideButton.offsetWidth - 12}px`;
      }
      showButton.style.top = `${lastBox.top + 6}px`;
      showButton.style.left = `${lastBox.left + 12}px`;
    };

    const setHidden = (hidden, remember) => {
      panel.classList.toggle("ag-settings-collapsed", hidden);
      document.body.classList.toggle("ag-settings-hidden", hidden);
      hideButton.hidden = hidden;
      showButton.hidden = !hidden;
      if (remember) {
        saveHidden(hidden);
      }
      place();
      // Let the app resize its canvas to the new space.
      requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    };

    hideButton.addEventListener("click", () => {
      setHidden(true, true);
      showButton.focus();
    });
    showButton.addEventListener("click", () => {
      setHidden(false, true);
      hideButton.focus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() !== "h" || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
        return;
      }
      setHidden(!panel.classList.contains("ag-settings-collapsed"), true);
    });

    window.addEventListener("resize", place);
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(place).observe(panel);
    }
    place();
    moveIntoRowIfCovering();
    place();
    // Web fonts can make a title wider once they load; check again then.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        moveIntoRowIfCovering();
        place();
      });
    }
    if (readHidden()) {
      setHidden(true, false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
