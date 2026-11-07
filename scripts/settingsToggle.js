// Hide / show an app's settings panel with one button (or the H key), so the canvas gets the room.
// Each app includes this script with the panel's selector:
//   <script defer src="../scripts/settingsToggle.js" data-panel="#controls"></script>
// The button sits in the panel's top-right corner, or on its own row at the top of the panel when
// something is under that corner; while hidden a "Settings" button takes the panel's top-left corner.
// An element with [data-settings-toggle-slot] inside the panel holds the Hide button instead.
// The choice is remembered per app.
//
// Mobile (max-width 768px, or a coarse pointer up to 1024px wide) turns the panel into a bottom sheet:
// a grab handle with the tool's name, snap points peek (handle only) / half / full, drag with velocity,
// spring settle, internal scroll only at full. H and the handle button switch between peek and half.
// While the sheet is on, <body> has the class "ag-sheet" and <html> the CSS variable --ag-sheet-h: the
// height the sheet currently covers (updated after it settles, then a "resize" event fires), so apps can
// fit their canvas above it, e.g. height: calc(100dvh - 60px - var(--ag-sheet-h, 0px)).
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

      /* Bottom sheet (mobile). Doubled classes + !important: wins over each app's own panel CSS. */
      html body.ag-sheet .ag-sheet-panel.ag-sheet-panel {
        position: fixed !important;
        z-index: 10000 !important; /* above .app-year (9999), below the nav menu */
        left: 0 !important;
        right: 0 !important;
        top: auto !important;
        bottom: 0 !important;
        width: auto !important;
        max-width: none !important;
        min-width: 0 !important;
        height: var(--ag-sheet-full, 88dvh) !important;
        max-height: none !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding-top: 0 !important;
        padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important;
        box-sizing: border-box !important;
        flex: none !important;
        overflow-x: hidden !important;
        overflow-y: hidden !important;
        overscroll-behavior: contain;
        border: 0 !important;
        border-top: 1px solid var(--ag-sheet-rule, rgba(255, 255, 255, 0.35)) !important;
        border-radius: 14px 14px 0 0 !important;
        background: var(--ag-sheet-bg, #000) !important;
        box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.35) !important;
        backdrop-filter: none !important;
        transform: translate3d(0, var(--ag-sheet-y, 0px), 0) !important;
        transition: transform var(--ag-dur-3, 420ms) cubic-bezier(.3, 1.25, .5, 1) !important;
        will-change: transform;
        touch-action: none;
      }
      html body.ag-sheet .ag-sheet-panel.ag-sheet-display { display: block !important; }
      html body.ag-sheet .ag-sheet-panel.is-full { overflow-y: auto !important; touch-action: pan-y; }
      html body.ag-sheet .ag-sheet-panel.is-dragging { transition: none !important; }
      body.ag-sheet button.ag-settings-toggle:not(.ag-sheet-button) { display: none !important; }
      /* Padded 100%-wide stages made phone pages 20px too wide (and the sheet slid off-screen). */
      body.ag-sheet .canvas-stage { box-sizing: border-box; max-width: 100%; }
      .ag-sheet-handle {
        position: sticky;
        top: 0;
        z-index: 20;
        display: none;
        flex: none;
        align-self: stretch;
        box-sizing: border-box;
        height: 64px;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding: 14px 12px 6px 16px;
        background: var(--ag-sheet-bg, #000);
        border-bottom: 1px solid var(--ag-sheet-rule, rgba(255, 255, 255, 0.35));
        color: var(--ag-sheet-fg, #fff) !important;
        touch-action: none;
        cursor: grab;
        user-select: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      body.ag-sheet .ag-sheet-handle { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .ag-sheet-handle::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 7px;
        width: 40px;
        height: 4px;
        margin-left: -20px;
        border-radius: 2px;
        background: currentColor;
        opacity: 0.45;
      }
      .ag-sheet-title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ag-sheet-fg, #fff) !important;
      }
      body.ag-sheet button.ag-settings-toggle.ag-sheet-button {
        position: static;
        flex: none;
        width: auto !important;
        height: 40px !important;
        min-height: 40px !important;
        margin: 0 !important;
        padding: 0 16px !important;
        border: 1px solid var(--ag-sheet-fg, #fff) !important;
        background: var(--ag-sheet-bg, #000) !important;
        color: var(--ag-sheet-fg, #fff) !important;
        font-size: 11px !important;
        letter-spacing: 0.08em !important;
        text-transform: uppercase !important;
      }
      @media (prefers-reduced-motion: reduce) {
        html body.ag-sheet .ag-sheet-panel.ag-sheet-panel { transition: none !important; }
      }
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

    const sheet = createSheet(panel);

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
      if (slot || sheet.on) {
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
      if (sheet.on) {
        return;
      }
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
      if (sheet.on) {
        sheet.toggle();
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
    if (readHidden() && !sheet.on) {
      setHidden(true, false);
    }

    // Switch between sidebar and bottom sheet when the viewport crosses the breakpoint.
    sheet.onExit = () => {
      setHidden(readHidden(), false);
      moveIntoRowIfCovering();
      place();
    };
    sheet.onEnter = () => {
      panel.classList.remove("ag-settings-collapsed");
      document.body.classList.remove("ag-settings-hidden");
    };
    sheet.start();
  }

  // ---------- Mobile bottom sheet ----------
  const SHEET_QUERY = "(max-width: 768px), (pointer: coarse) and (max-width: 1024px)";
  const PEEK = 64;

  function isTransparent(color) {
    return !color || color === "transparent" || /rgba\([^)]*,\s*0\)$/.test(color);
  }

  function createSheet(panel) {
    const query = window.matchMedia ? window.matchMedia(SHEET_QUERY) : null;
    const storageKey = `ag-sheet:${location.pathname}`;
    const root = document.documentElement;
    const handle = document.createElement("div");
    handle.className = "ag-sheet-handle";
    const title = document.createElement("span");
    title.className = "ag-sheet-title";
    title.textContent = `${(document.title.split("·")[0] || "").trim() || "Tool"} · Settings`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ag-settings-toggle ag-sheet-button";
    button.setAttribute("aria-controls", panel.id);
    handle.append(title, button);

    const state = { on: false, snap: "peek", onEnter: null, onExit: null };
    let fullH = 0;
    let visibleBySnap = { peek: PEEK, half: 0, full: 0 };
    let y = 0;
    let settleTimer = 0;

    const measure = () => {
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;visibility:hidden;height:env(safe-area-inset-bottom,0px)";
      document.body.appendChild(probe);
      const safe = probe.offsetHeight;
      probe.remove();
      fullH = panel.offsetHeight;
      visibleBySnap = {
        peek: PEEK + safe,
        half: Math.min(fullH, Math.round(window.innerHeight * 0.5)),
        full: fullH,
      };
    };

    const setY = (value) => {
      y = value;
      panel.style.setProperty("--ag-sheet-y", `${Math.round(value)}px`);
    };

    // Covered height only changes once the sheet has settled, so apps refit once, not per frame.
    const settled = (notify) => {
      const covered = `${Math.max(0, Math.round(fullH - y))}px`;
      if (root.style.getPropertyValue("--ag-sheet-h") !== covered) {
        root.style.setProperty("--ag-sheet-h", covered);
        if (notify) {
          window.dispatchEvent(new Event("resize"));
        }
      }
    };

    const setSnap = (name, animate) => {
      state.snap = name;
      panel.classList.toggle("is-dragging", !animate);
      panel.classList.toggle("is-full", name === "full");
      if (name !== "full") {
        panel.scrollTop = 0;
      }
      const target = fullH - visibleBySnap[name];
      const moved = Math.abs(target - y) > 0.5;
      setY(target);
      button.textContent = name === "peek" ? "Settings" : "Hide";
      button.title = name === "peek" ? "Show settings (H)" : "Hide settings (H)";
      button.setAttribute("aria-expanded", String(name !== "peek"));
      try {
        localStorage.setItem(storageKey, name);
      } catch (error) {
        // Only a convenience.
      }
      clearTimeout(settleTimer);
      if (animate && moved) {
        settleTimer = setTimeout(() => settled(true), 460);
      } else {
        settled(true);
      }
    };
    panel.addEventListener("transitionend", (event) => {
      if (state.on && event.target === panel && event.propertyName === "transform") {
        clearTimeout(settleTimer);
        settled(true);
      }
    });

    state.toggle = () => setSnap(state.snap === "peek" ? "half" : "peek", true);
    button.addEventListener("click", () => {
      if (!dragMoved) {
        state.toggle();
      }
    });

    // Dragging: the handle always; the content too while not at full (no scrolling there anyway).
    let drag = null;
    let dragMoved = false;
    const isControl = (target) => target.closest && target.closest('input, select, textarea, [contenteditable], [role="slider"], canvas');
    const onDown = (event) => {
      if (!state.on || (event.pointerType === "mouse" && event.button !== 0)) {
        return;
      }
      const onHandle = handle.contains(event.target);
      if (!onHandle && (state.snap === "full" || isControl(event.target))) {
        return;
      }
      dragMoved = false;
      drag = { id: event.pointerId, startY: event.clientY, startSheet: y, lastY: event.clientY, lastT: event.timeStamp, v: 0, captured: false };
    };
    const onMove = (event) => {
      if (!drag || event.pointerId !== drag.id) {
        return;
      }
      const dy = event.clientY - drag.startY;
      if (!drag.captured) {
        if (Math.abs(dy) < 6) {
          return;
        }
        drag.captured = true;
        dragMoved = true;
        panel.classList.add("is-dragging");
        try {
          panel.setPointerCapture(event.pointerId);
        } catch (error) {
          // Capture is a nicety; moves still arrive while over the sheet.
        }
      }
      const dt = event.timeStamp - drag.lastT;
      if (dt > 0) {
        drag.v = 0.7 * ((event.clientY - drag.lastY) / dt) + 0.3 * drag.v;
      }
      drag.lastY = event.clientY;
      drag.lastT = event.timeStamp;
      const min = fullH - visibleBySnap.full;
      const max = fullH - visibleBySnap.peek;
      let next = drag.startSheet + dy;
      // Rubber band past the ends.
      if (next < min) {
        next = min - (min - next) * 0.3;
      } else if (next > max) {
        next = max + (next - max) * 0.3;
      }
      setY(next);
      event.preventDefault();
    };
    const onUp = (event) => {
      if (!drag || event.pointerId !== drag.id) {
        return;
      }
      const wasDragging = drag.captured;
      const velocity = event.type === "pointercancel" ? 0 : drag.v;
      drag = null;
      panel.classList.remove("is-dragging");
      if (!wasDragging) {
        // A tap on the handle (outside its button) toggles peek / half.
        if (handle.contains(event.target) && !button.contains(event.target)) {
          setSnap(state.snap === "half" ? "peek" : "half", true);
        }
        return;
      }
      // Project where a flick would land, then take the nearest snap point.
      const projected = fullH - (y + Math.max(-1.5, Math.min(1.5, velocity)) * 120);
      let best = "peek";
      Object.keys(visibleBySnap).forEach((name) => {
        if (Math.abs(visibleBySnap[name] - projected) < Math.abs(visibleBySnap[best] - projected)) {
          best = name;
        }
      });
      setSnap(best, true);
      setTimeout(() => {
        dragMoved = false;
      }, 0);
    };
    panel.addEventListener("pointerdown", onDown);
    panel.addEventListener("pointermove", onMove);
    panel.addEventListener("pointerup", onUp);
    panel.addEventListener("pointercancel", onUp);
    // A drag that started on a button must not also press it.
    panel.addEventListener("click", (event) => {
      if (dragMoved) {
        event.stopPropagation();
        event.preventDefault();
        dragMoved = false;
      }
    }, true);

    const sheetColors = () => {
      const style = getComputedStyle(panel);
      let bg = style.backgroundColor;
      for (let node = panel.parentElement; isTransparent(bg) && node; node = node.parentElement) {
        bg = getComputedStyle(node).backgroundColor;
      }
      if (isTransparent(bg)) {
        bg = "#000";
      } else if (/^rgba/.test(bg)) {
        // A translucent panel (Swing) gets its colour without the see-through.
        bg = bg.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, "rgb($1,$2,$3)");
      }
      panel.style.setProperty("--ag-sheet-bg", bg);
      panel.style.setProperty("--ag-sheet-fg", style.color);
      panel.style.setProperty("--ag-sheet-rule", `color-mix(in srgb, ${style.color} 35%, transparent)`);
    };

    const enter = () => {
      state.on = true;
      if (state.onEnter) {
        state.onEnter();
      }
      sheetColors();
      const hiddenByApp = getComputedStyle(panel).display === "none";
      document.body.classList.add("ag-sheet");
      panel.classList.add("ag-sheet-panel", "is-dragging");
      panel.classList.toggle("ag-sheet-display", hiddenByApp);
      panel.insertBefore(handle, panel.firstChild);
      const style = getComputedStyle(panel);
      handle.style.marginLeft = `-${style.paddingLeft}`;
      handle.style.marginRight = `-${style.paddingRight}`;
      measure();
      let saved = "peek";
      try {
        saved = localStorage.getItem(storageKey) || "peek";
      } catch (error) {
        // Default.
      }
      y = fullH - visibleBySnap.peek;
      setSnap(visibleBySnap[saved] ? saved : "peek", false);
      requestAnimationFrame(() => panel.classList.remove("is-dragging"));
    };

    const exit = () => {
      state.on = false;
      clearTimeout(settleTimer);
      document.body.classList.remove("ag-sheet");
      panel.classList.remove("ag-sheet-panel", "ag-sheet-display", "is-full", "is-dragging");
      ["--ag-sheet-y", "--ag-sheet-bg", "--ag-sheet-fg", "--ag-sheet-rule"].forEach((name) => panel.style.removeProperty(name));
      root.style.removeProperty("--ag-sheet-h");
      handle.remove();
      if (state.onExit) {
        state.onExit();
      }
      window.dispatchEvent(new Event("resize"));
    };

    state.start = () => {
      if (!query) {
        return;
      }
      const sync = () => {
        if (query.matches && !state.on) {
          enter();
        } else if (!query.matches && state.on) {
          exit();
        }
      };
      sync();
      if (query.addEventListener) {
        query.addEventListener("change", sync);
      } else if (query.addListener) {
        query.addListener(sync);
      }
      // Viewport height changes (rotation, iOS toolbar): keep the same snap point.
      window.addEventListener("resize", () => {
        if (!state.on || drag) {
          return;
        }
        const oldFull = fullH;
        const oldHalf = visibleBySnap.half;
        measure();
        if (oldFull !== fullH || oldHalf !== visibleBySnap.half) {
          setY(fullH - visibleBySnap[state.snap]);
          settled(false);
        }
      });
    };
    return state;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
