// Shared "lab notebook" data layer + motion helpers for every Accidental Graphics page.
// Include (with css/data.css) in the <head>, before settingsToggle.js:
//   <link rel="stylesheet" href="../css/data.css">
//   <script src="../scripts/dataLayer.js"></script>   (no defer: inline app scripts can use AGData right away)
// Everything is DOM-only: nothing is ever drawn into a canvas, so overlays can't end up in exports.
//
// API (window.AGData)
//   AGData.hud(stageEl, opts) -> hud
//     Live readouts of a tool, gathered in ONE small list tucked into the bottom-right corner of the page
//     (never on or around the canvas). Folded, the list shows only the time on the whole site and the
//     current clock; hover, keyboard focus or a tap unfolds every value. Colours follow the page.
//     opts.canvas   <canvas> to measure: canvas size and pointer X/Y in canvas pixels (CSS scaling undone).
//                   Default: stageEl if it is a canvas.
//     opts.code     specimen code, e.g. "ISO" -> "SPEC. ISO-0007" (counter in localStorage
//                   "ag-specimen:<code>"). Omit for no specimen line.
//     opts.pointer / opts.size / opts.fps   false hides that part.
//                   fps is only shown while the app reports frames (hud.frame()) and runs at >= 1 fps.
//     hud.set(key, value, unit?)  app value (strokes, layers, colours...), listed after canvas size.
//                   value null removes it. Numbers are shown as is: pass AGData.fmt() output.
//                   (A 4th "slot" argument from the old corner layout is accepted and ignored.)
//     hud.frame(now?)   call once per rendered frame: fps then measures the app's real frame rate and a
//                   frame counter appears.
//     hud.newSpecimen() -> "ISO-0008"   next specimen id; also resets the frame count.
//     hud.refresh()     re-measure after a layout change the HUD can't see (it watches resize + scroll).
//     hud.destroy()
//     Text updates at ~12 Hz from one rAF loop, skipped while the data layer is hidden or the tab is hidden.
//     --ag-hud-band / --ag-hud-side (css/data.css) stay as the breathing room tools leave around a canvas.
//   AGData.siteTime() -> seconds on the whole site (all pages and tabs; a visit ends after 30 min away).
//   AGData.readouts(panelEl, opts) -> [{ input, el, created }]
//     Gives every input[type=range] in the panel without a visible value display a compact .ag-readout
//     (zero-padded to max's digits, decimals from step, unit from data-unit="px"). Existing displays
//     (<output>, number input, a label/sibling that already shows the value) are left alone; with
//     opts.tick (default true) they still get the tick animation. Programmatic value changes are seen too.
//     opts.pad (default false) zero-pads. Returned list .refresh() re-renders all.
//   AGData.setVisible(bool) / AGData.visible   overlays on/off (D key does the same; remembered in
//     localStorage "ag-data-visible", default on). Fires "ag-data-visibility" on window ({detail:{visible}}).
//   AGData.spring(from, to, { stiffness=170, damping=26, mass=1, velocity=0, precision=0.01, onUpdate, onDone })
//     -> { stop() }   tiny rAF spring; onUpdate(value, velocity). Jumps to `to` with reduced motion.
//   AGData.tick(el)     replays the number-tick animation on el.
//   AGData.fmt(value, decimals=0, width=0) -> "042.50"   zero-padded fixed number (sign kept).
//   AGData.reducedMotion   boolean (live).
//   html.ag-motion is set here: css/data.css then adds button press springs and hover easing.
(function () {
  "use strict";

  if (window.AGData) {
    return;
  }

  const VISIBLE_KEY = "ag-data-visible";
  const root = document.documentElement;
  root.classList.add("ag-motion");

  const motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Only a convenience.
    }
  }

  // Same rule as settingsToggle.js: keys typed into text fields are not shortcuts.
  function isTyping(target) {
    if (!target || !target.tagName) {
      return false;
    }
    if (target.isContentEditable || ["TEXTAREA", "SELECT"].includes(target.tagName)) {
      return true;
    }
    return target.tagName === "INPUT" && !["range", "checkbox", "radio", "color", "file", "button"].includes(target.type);
  }

  function fmt(value, decimals, width) {
    decimals = decimals || 0;
    width = width || 0;
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "-".repeat(Math.max(1, width));
    }
    const text = Math.abs(number).toFixed(decimals);
    const dot = text.indexOf(".");
    const intLength = dot === -1 ? text.length : dot;
    const padded = intLength < width ? "0".repeat(width - intLength) + text : text;
    return (number < 0 && Number(text) !== 0 ? "-" : "") + padded;
  }

  function el(tag, className, parent) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (parent) {
      parent.appendChild(node);
    }
    return node;
  }

  // Sets a text node only when it changes (no layout work for unchanged values).
  function setText(node, text) {
    if (node.data !== text) {
      node.data = text;
    }
  }

  function tick(node) {
    if (!node || AGData.reducedMotion) {
      return;
    }
    const next = node.classList.contains("ag-tick-a") ? "ag-tick-b" : "ag-tick-a";
    node.classList.remove("ag-tick-a", "ag-tick-b");
    node.classList.add(next);
  }

  // ---------- Visibility (D key) ----------
  let visible = storageGet(VISIBLE_KEY) !== "0";

  function applyVisible() {
    root.classList.toggle("ag-data-hidden", !visible);
  }

  function setVisible(value) {
    visible = Boolean(value);
    storageSet(VISIBLE_KEY, visible ? "1" : "0");
    applyVisible();
    window.dispatchEvent(new CustomEvent("ag-data-visibility", { detail: { visible } }));
  }
  applyVisible();

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "d" || event.metaKey || event.ctrlKey || event.altKey || event.repeat || isTyping(event.target)) {
      return;
    }
    setVisible(!visible);
  });

  // Button release spring (css/data.css .ag-released); the press itself is pure CSS (:active).
  document.addEventListener("pointerup", (event) => {
    if (!root.classList.contains("ag-motion") || AGData.reducedMotion) {
      return;
    }
    const target = event.target && event.target.closest && event.target.closest('button, input[type="button"], input[type="submit"], .ag-pressable');
    if (!target || target.disabled) {
      return;
    }
    target.classList.remove("ag-released");
    // Restart the animation on the next frame (removing and adding in one frame would not replay it).
    requestAnimationFrame(() => target.classList.add("ag-released"));
  }, { passive: true });
  document.addEventListener("animationend", (event) => {
    if (event.animationName === "ag-release") {
      event.target.classList.remove("ag-released");
    }
  });

  // ---------- Spring ----------
  function spring(from, to, options) {
    options = options || {};
    const stiffness = options.stiffness || 170;
    const damping = options.damping || 26;
    const mass = options.mass || 1;
    const precision = options.precision || 0.01;
    let value = from;
    let velocity = options.velocity || 0;
    let last = 0;
    let frame = 0;
    let stopped = false;

    const finish = () => {
      stopped = true;
      if (options.onUpdate) {
        options.onUpdate(to, 0);
      }
      if (options.onDone) {
        options.onDone();
      }
    };

    const step = (now) => {
      if (stopped) {
        return;
      }
      // Fixed sub-steps keep the integration stable on slow frames.
      let dt = last ? Math.min(0.064, (now - last) / 1000) : 1 / 60;
      last = now;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 240);
        const force = -stiffness * (value - to) - damping * velocity;
        velocity += (force / mass) * h;
        value += velocity * h;
        dt -= h;
      }
      if (Math.abs(velocity) < precision && Math.abs(value - to) < precision) {
        finish();
        return;
      }
      if (options.onUpdate) {
        options.onUpdate(value, velocity);
      }
      frame = requestAnimationFrame(step);
    };

    if (AGData.reducedMotion) {
      finish();
    } else {
      frame = requestAnimationFrame(step);
    }
    return {
      stop() {
        stopped = true;
        cancelAnimationFrame(frame);
      },
    };
  }

  // ---------- Site time ----------
  // Time on the whole site (not per page): one visit runs across pages and tabs until the site has
  // been left alone for 30 minutes. Stored in localStorage "ag-site-visit" as {start, last}.
  const VISIT_KEY = "ag-site-visit";
  const VISIT_GAP = 30 * 60 * 1000;
  let visitStart = 0;
  let visitWritten = 0;

  function siteTime() {
    const now = Date.now();
    if (!visitStart || now - visitWritten > 5000) {
      let visit = null;
      try {
        visit = JSON.parse(storageGet(VISIT_KEY) || "null");
      } catch (error) {
        visit = null;
      }
      if (visit && Number.isFinite(visit.start) && Number.isFinite(visit.last) && now - visit.last < VISIT_GAP && visit.start <= now) {
        visitStart = visit.start;
      } else if (!visitStart || now - visitWritten > VISIT_GAP) {
        visitStart = now;
      }
      visitWritten = now;
      storageSet(VISIT_KEY, JSON.stringify({ start: visitStart, last: now }));
    }
    return (now - visitStart) / 1000;
  }

  function clockText(seconds) {
    const t = Math.max(0, Math.floor(seconds));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    return `${fmt(h, 0, 2)}:${fmt(m, 0, 2)}:${fmt(t % 60, 0, 2)}`;
  }

  function nowText() {
    const d = new Date();
    return `${fmt(d.getHours(), 0, 2)}:${fmt(d.getMinutes(), 0, 2)}:${fmt(d.getSeconds(), 0, 2)}`;
  }

  // ---------- Info list (corner) ----------
  // All small readouts of a page in one tidy list, tucked into the bottom-right corner. Folded it shows
  // only the time on the site and the clock; hover, focus or a tap unfolds the full list upwards.
  let infoBox = null;

  function infoList() {
    if (infoBox) {
      return infoBox;
    }
    const box = el("div", "ag-info ag-data");
    box.tabIndex = 0;
    box.setAttribute("role", "button");
    box.setAttribute("aria-expanded", "false");
    box.setAttribute("aria-label", "Info: time on the site, clock and live values");
    const list = el("div", "ag-info__list", box);
    const summary = el("div", "ag-info__summary", box);
    const siteRow = el("span", "ag-info__pair", summary);
    el("span", "ag-info__k", siteRow).textContent = "Site";
    const siteValue = document.createTextNode("00:00:00");
    el("span", "ag-info__v", siteRow).appendChild(siteValue);
    const nowRow = el("span", "ag-info__pair", summary);
    el("span", "ag-info__k", nowRow).textContent = "Now";
    const nowValue = document.createTextNode(nowText());
    el("span", "ag-info__v", nowRow).appendChild(nowValue);

    const setOpen = (open) => {
      box.classList.toggle("is-open", open);
      box.setAttribute("aria-expanded", String(open));
    };
    box.addEventListener("click", (event) => {
      event.stopPropagation();
      setOpen(!box.classList.contains("is-open"));
    });
    box.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(!box.classList.contains("is-open"));
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!box.contains(event.target)) {
        setOpen(false);
      }
    }, { passive: true });

    const mount = () => document.body.appendChild(box);
    if (document.body) {
      mount();
    } else {
      document.addEventListener("DOMContentLoaded", mount, { once: true });
    }

    // Above the mobile bottom sheet (settingsToggle.js sets --ag-sheet-h).
    const place = () => {
      const sheet = document.body && document.body.classList.contains("ag-sheet")
        ? parseFloat(getComputedStyle(root).getPropertyValue("--ag-sheet-h")) || 0
        : 0;
      box.style.setProperty("--ag-info-lift", `${sheet}px`);
    };
    window.addEventListener("resize", place);
    if (typeof MutationObserver === "function") {
      new MutationObserver(place).observe(root, { attributes: true, attributeFilter: ["style"] });
    }
    place();

    const tickClock = () => {
      if (!document.hidden) {
        setText(siteValue, clockText(siteTime()));
        setText(nowValue, nowText());
      }
    };
    tickClock();
    setInterval(tickClock, 1000);

    infoBox = { box, list };
    return infoBox;
  }

  // ---------- HUD ----------
  function readSpecimen(code) {
    const value = parseInt(storageGet(`ag-specimen:${code}`) || "0", 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function specimenId(code, number) {
    return `${code}-${fmt(number, 0, 4)}`;
  }

  // Same API as before (set / frame / newSpecimen / refresh / destroy); the readouts now live in the
  // corner list instead of around the canvas. The slot argument is accepted and ignored.
  function hud(stageEl, opts) {
    opts = opts || {};
    if (!stageEl) {
      throw new Error("AGData.hud: stage element missing");
    }
    const canvas = opts.canvas || (stageEl.tagName === "CANVAS" ? stageEl : null);
    const show = (name) => opts[name] !== false;
    const { list } = infoList();

    // Rows keep a fixed order by group: specimen + size first, app values, then pointer and timing.
    const groups = { head: el("div", "ag-info__group", list), app: el("div", "ag-info__group", list), tail: el("div", "ag-info__group", list) };
    const line = (group, label, unit) => {
      const row = el("div", "ag-info__row", groups[group]);
      el("span", "ag-info__k", row).textContent = label;
      const valueEl = el("span", "ag-info__v", row);
      const value = document.createTextNode("");
      valueEl.appendChild(value);
      const unitNode = document.createTextNode(unit ? ` ${unit}` : "");
      el("span", "ag-info__u", valueEl).appendChild(unitNode);
      return { row, value, unit: unitNode };
    };

    const code = opts.code ? String(opts.code).toUpperCase() : "";
    let specimen = code ? Math.max(1, readSpecimen(code)) : 0;
    if (code && !readSpecimen(code)) {
      storageSet(`ag-specimen:${code}`, String(specimen));
    }
    const specLine = code ? line("head", "Spec.", "") : null;
    const sizeLine = show("size") && canvas ? line("head", "Canvas", "px") : null;
    const pointerLine = show("pointer") ? line("tail", "Pointer", "") : null;
    const fpsLine = show("fps") ? line("tail", "Rate", "fps") : null;
    const timeLine = null; // time is site-wide now: see the folded line (siteTime)
    let frameLine = null;
    if (fpsLine) {
      fpsLine.row.hidden = true;
    }
    const custom = new Map();

    const renderSpecimen = () => {
      if (specLine) {
        setText(specLine.value, specimenId(code, specimen));
      }
    };
    renderSpecimen();

    let clientX = NaN;
    let clientY = NaN;
    let canvasRect = null;
    let scaleX = 1;
    let scaleY = 1;
    const layout = () => {
      if (!canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      canvasRect = rect;
      if (rect.width && rect.height) {
        scaleX = canvas.width / rect.width;
        scaleY = canvas.height / rect.height;
      }
    };
    let layoutQueued = false;
    const queueLayout = () => {
      if (!layoutQueued) {
        layoutQueued = true;
        requestAnimationFrame(() => {
          layoutQueued = false;
          layout();
        });
      }
    };
    window.addEventListener("resize", queueLayout);
    window.addEventListener("scroll", queueLayout, { passive: true, capture: true });
    let observer = null;
    if (typeof ResizeObserver === "function" && canvas) {
      observer = new ResizeObserver(queueLayout);
      observer.observe(canvas);
    }
    layout();

    const onPointer = (event) => {
      clientX = event.clientX;
      clientY = event.clientY;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });

    let start = performance.now();
    let appFrames = 0;
    let usesAppFrames = false;
    let windowFrames = 0;
    let windowStart = start;
    let lastText = 0;
    let raf = 0;
    let alive = true;
    let lastSize = "";

    const update = (now) => {
      if (sizeLine) {
        const size = `${fmt(canvas.width, 0, 4)} × ${fmt(canvas.height, 0, 4)}`;
        if (size !== lastSize) {
          lastSize = size;
          setText(sizeLine.value, size);
          layout();
        }
      }
      if (pointerLine) {
        let text = "---- · ----";
        if (canvasRect && clientX >= canvasRect.left && clientX <= canvasRect.right && clientY >= canvasRect.top && clientY <= canvasRect.bottom) {
          text = `${fmt(Math.floor((clientX - canvasRect.left) * scaleX), 0, 4)} · ${fmt(Math.floor((clientY - canvasRect.top) * scaleY), 0, 4)}`;
        }
        setText(pointerLine.value, text);
      }
      if (fpsLine && now - windowStart >= 500) {
        const fps = (windowFrames * 1000) / (now - windowStart);
        windowFrames = 0;
        windowStart = now;
        setText(fpsLine.value, fmt(fps, 0, 2));
        fpsLine.row.hidden = !(usesAppFrames && fps >= 1);
      }
      if (timeLine) {
        setText(timeLine.value, clockText((now - start) / 1000));
      }
      if (frameLine) {
        setText(frameLine.value, fmt(appFrames, 0, 6));
      }
    };

    const loop = (now) => {
      if (!alive) {
        return;
      }
      raf = requestAnimationFrame(loop);
      if (!usesAppFrames) {
        windowFrames += 1;
      }
      if (now - lastText < 83 || !visible || document.hidden) {
        return;
      }
      lastText = now;
      update(now);
    };
    raf = requestAnimationFrame(loop);

    const api = {
      element: list,
      get specimen() {
        return code ? specimenId(code, specimen) : "";
      },
      set(key, value, unit) {
        let entry = custom.get(key);
        if (value === null || value === undefined) {
          if (entry) {
            entry.row.remove();
            custom.delete(key);
          }
          return api;
        }
        if (!entry) {
          entry = line("app", key, unit);
          custom.set(key, entry);
        } else if (unit !== undefined) {
          setText(entry.unit, unit ? ` ${unit}` : "");
        }
        setText(entry.value, String(value));
        return api;
      },
      frame() {
        if (!usesAppFrames) {
          usesAppFrames = true;
          windowFrames = 0;
          windowStart = performance.now();
          if (show("fps")) {
            frameLine = line("tail", "Frames", "");
          }
        }
        appFrames += 1;
        windowFrames += 1;
      },
      newSpecimen() {
        start = performance.now();
        appFrames = 0;
        if (!code) {
          return "";
        }
        specimen = readSpecimen(code) + 1;
        storageSet(`ag-specimen:${code}`, String(specimen));
        renderSpecimen();
        if (specLine) {
          tick(specLine.value.parentNode);
        }
        return specimenId(code, specimen);
      },
      refresh() {
        layout();
        return api;
      },
      destroy() {
        alive = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", queueLayout);
        window.removeEventListener("scroll", queueLayout, { capture: true });
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointerdown", onPointer);
        if (observer) {
          observer.disconnect();
        }
        Object.values(groups).forEach((group) => group.remove());
      },
    };
    return api;
  }

  // ---------- Slider readouts ----------
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");

  function decimalsOf(input) {
    const step = input.getAttribute("step");
    if (step === "any") {
      return 2;
    }
    const text = step || "1";
    const dot = text.indexOf(".");
    return dot === -1 ? 0 : Math.min(4, text.length - dot - 1);
  }

  function showsValue(node, value) {
    if (!node || node.nodeType !== 1) {
      return false;
    }
    if (node.matches('output, input[type="number"]') || node.querySelector('output, input[type="number"]')) {
      return true;
    }
    const pattern = new RegExp(`(^|[^\\d.])${value.replace(".", "\\.")}(?![\\d])`);
    return pattern.test(node.textContent || "");
  }

  function findDisplay(input) {
    const value = String(Number(input.value));
    const label = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
    const parent = input.parentElement;
    const candidates = [label, input.nextElementSibling, input.previousElementSibling];
    if (parent && parent.tagName === "LABEL") {
      candidates.push(parent);
    }
    // In a small row wrapper (label + slider + value), any sibling may hold the value.
    if (parent && parent.children.length <= 5) {
      Array.prototype.forEach.call(parent.children, (child) => {
        if (child !== input) {
          candidates.push(child);
        }
      });
    }
    return candidates.find((node) => node && node !== input && showsValue(node, value)) || null;
  }

  function readouts(panelEl, opts) {
    opts = opts || {};
    const pad = opts.pad === true;
    const doTick = opts.tick !== false;
    const list = [];
    if (!panelEl) {
      return list;
    }
    panelEl.querySelectorAll('input[type="range"]').forEach((input) => {
      if (input.dataset.agReadout) {
        return;
      }
      input.dataset.agReadout = "1";
      const existing = findDisplay(input);
      if (existing) {
        if (doTick) {
          input.addEventListener("input", () => tick(existing));
        }
        list.push({ input, el: existing, created: false });
        return;
      }
      const decimals = decimalsOf(input);
      const width = pad ? String(Math.floor(Math.max(Math.abs(Number(input.max) || 100), Math.abs(Number(input.min) || 0)))).length : 0;
      const readout = el("span", "ag-readout");
      readout.setAttribute("aria-hidden", "true");
      const valueEl = el("span", "ag-readout__value", readout);
      const valueText = document.createTextNode("");
      valueEl.appendChild(valueText);
      const unit = input.dataset.unit;
      if (unit) {
        el("span", "ag-readout__unit", readout).textContent = unit;
      }
      const label = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
      const host = label && !label.contains(input) ? label : input.parentElement && input.parentElement.tagName === "LABEL" ? input.parentElement : null;
      if (host) {
        readout.classList.add("ag-readout--in-label");
        // Same line box as the label text, so the smaller mono value lines up with it.
        const hostStyle = getComputedStyle(host);
        const lineHeight = parseFloat(hostStyle.lineHeight) || parseFloat(hostStyle.fontSize) * 1.2;
        if (lineHeight) {
          readout.style.lineHeight = `${lineHeight}px`;
        }
        host.appendChild(readout);
      } else {
        readout.classList.add("ag-readout--after");
        input.insertAdjacentElement("afterend", readout);
      }
      const render = (animate) => {
        const before = valueText.data;
        setText(valueText, fmt(input.value, decimals, width));
        if (animate && doTick && before && before !== valueText.data) {
          tick(valueEl);
        }
      };
      input.addEventListener("input", () => render(true));
      input.addEventListener("change", () => render(false));
      // Apps also set .value from code (presets, randomise, undo, animation): follow those, without tick.
      if (valueSetter && valueSetter.set) {
        try {
          Object.defineProperty(input, "value", {
            configurable: true,
            get() {
              return valueSetter.get.call(this);
            },
            set(next) {
              valueSetter.set.call(this, next);
              render(false);
            },
          });
        } catch (error) {
          // Read-only in some engine: input/change events still update it.
        }
      }
      render(false);
      list.push({ input, el: readout, created: true, render });
    });
    list.refresh = () => list.forEach((item) => item.render && item.render(false));
    return list;
  }

  const AGData = {
    hud,
    siteTime,
    readouts,
    spring,
    tick,
    fmt,
    setVisible,
    get visible() {
      return visible;
    },
    get reducedMotion() {
      return Boolean(motionQuery && motionQuery.matches);
    },
  };
  window.AGData = AGData;
})();
