// Shared "lab notebook" data layer + motion helpers for every Accidental Graphics page.
// Include (with css/data.css) in the <head>, before settingsToggle.js:
//   <link rel="stylesheet" href="../css/data.css">
//   <script src="../scripts/dataLayer.js"></script>   (no defer: inline app scripts can use AGData right away)
// Everything is DOM-only: nothing is ever drawn into a canvas, so overlays can't end up in exports.
//
// API (window.AGData)
//   AGData.hud(stageEl, opts) -> hud
//     Overlay with rulers, registration marks and live readouts over a stage. stageEl is the element that
//     wraps the canvas (it must be positioned: relative/absolute/fixed). If stageEl is the <canvas> itself
//     (or another replaced element), the HUD is a fixed overlay that follows the element's box instead.
//     opts.canvas   <canvas> to measure: pointer X/Y are reported in canvas pixels (CSS scaling undone)
//                   and the frame/rulers hug the canvas' box. Default: stageEl if it is a canvas.
//     opts.code     specimen code, e.g. "ISO" -> "SPEC. ISO-0007" (counter in localStorage
//                   "ag-specimen:<code>"). Omit for no specimen line.
//     opts.pointer / opts.size / opts.fps / opts.time / opts.rulers / opts.marks   false hides that part.
//     opts.slots    where the built-in lines go, default { specimen: "tl", size: "tr", pointer: "bl", timing: "br" }
//                   (e.g. { specimen: "tr" } when the settings panel covers the top-left corner).
//     opts.blend    default true: white + mix-blend-mode difference (readable on any artwork).
//                   false: uses --ag-data-fg / currentColor.
//     hud.set(key, value, unit?, slot?)  app stat (strokes, layers, colours...). slot: "tl"|"tr"|"bl"|"br",
//                   default "tr". value null removes it. Numbers are shown as is: pass AGData.fmt() output.
//     hud.frame(now?)   call once per rendered frame: fps then measures the app's real frame rate and a
//                   frame counter appears. Without calls, fps follows requestAnimationFrame.
//     hud.newSpecimen() -> "ISO-0008"   next specimen id; also resets elapsed time and frame count.
//     hud.refresh()     re-measure after a layout change the HUD can't see (it watches resize + scroll).
//     hud.destroy()
//     Text updates at ~12 Hz from one rAF loop, skipped while the data layer is hidden or the tab is hidden.
//   AGData.readouts(panelEl, opts) -> [{ input, el, created }]
//     Gives every input[type=range] in the panel without a visible value display a compact .ag-readout
//     (zero-padded to max's digits, decimals from step, unit from data-unit="px"). Existing displays
//     (<output>, number input, a label/sibling that already shows the value) are left alone; with
//     opts.tick (default true) they still get the tick animation. Programmatic value changes are seen too.
//     opts.pad (default true) zero-pads. Returned list .refresh() re-renders all.
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

  // ---------- HUD ----------
  function readSpecimen(code) {
    const value = parseInt(storageGet(`ag-specimen:${code}`) || "0", 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function specimenId(code, number) {
    return `${code}-${fmt(number, 0, 4)}`;
  }

  function hud(stageEl, opts) {
    opts = opts || {};
    if (!stageEl) {
      throw new Error("AGData.hud: stage element missing");
    }
    const isReplaced = /^(CANVAS|IMG|VIDEO|SVG)$/i.test(stageEl.tagName);
    const canvas = opts.canvas || (stageEl.tagName === "CANVAS" ? stageEl : null);
    const show = (name) => opts[name] !== false;

    const box = el("div", "ag-hud ag-data" + (isReplaced ? " ag-hud--fixed" : "") + (opts.blend === false ? "" : " ag-hud--blend"));
    box.setAttribute("aria-hidden", "true");
    const frameEl = el("div", "ag-hud__frame", box);
    if (show("rulers")) {
      el("div", "ag-ruler ag-ruler--top", frameEl);
      el("div", "ag-ruler ag-ruler--left", frameEl);
    }
    if (show("marks")) {
      ["tl", "tr", "bl", "br"].forEach((corner) => el("span", `ag-reg ag-reg--${corner}`, frameEl));
    }
    const slots = {};
    ["tl", "tr", "bl", "br"].forEach((corner) => {
      slots[corner] = el("div", `ag-hud__slot ag-hud__slot--${corner}`, frameEl);
    });

    // One readout line: [label] value [unit]; returns its text nodes.
    const line = (slot, label, unit) => {
      const row = el("span", "ag-readout", slots[slot]);
      const parts = { row, label: null, value: document.createTextNode(""), unit: null };
      if (label) {
        el("span", "ag-readout__label", row).textContent = label;
      }
      el("span", "ag-readout__value", row).appendChild(parts.value);
      const unitEl = el("span", "ag-readout__unit", row);
      parts.unit = document.createTextNode(unit || "");
      unitEl.appendChild(parts.unit);
      if (!unit) {
        unitEl.hidden = true;
      }
      return parts;
    };

    const place = Object.assign({ specimen: "tl", size: "tr", pointer: "bl", timing: "br" }, opts.slots);
    const code = opts.code ? String(opts.code).toUpperCase() : "";
    let specimen = code ? Math.max(1, readSpecimen(code)) : 0;
    if (code && !readSpecimen(code)) {
      storageSet(`ag-specimen:${code}`, String(specimen));
    }
    const specLine = code ? line(place.specimen, "Spec.") : null;
    const dateLine = code ? line(place.specimen, "") : null;
    if (dateLine) {
      const now = new Date();
      setText(dateLine.value, `${now.getFullYear()}.${fmt(now.getMonth() + 1, 0, 2)}.${fmt(now.getDate(), 0, 2)}`);
    }
    const sizeLine = show("size") && canvas ? line(place.size, "", "px") : null;
    const pointerLine = show("pointer") ? line(place.pointer, "") : null;
    const fpsLine = show("fps") ? line(place.timing, "", "fps") : null;
    const timeLine = show("time") ? line(place.timing, "T+") : null;
    if (fpsLine) {
      setText(fpsLine.value, "--");
    }
    let frameLine = null;
    const custom = new Map();

    const renderSpecimen = () => {
      if (specLine) {
        setText(specLine.value, specimenId(code, specimen));
      }
    };
    renderSpecimen();

    if (isReplaced) {
      document.body.appendChild(box);
    } else {
      stageEl.appendChild(box);
    }

    let clientX = NaN;
    let clientY = NaN;
    let lastPointerText = "";

    // Layout, cached; refreshed on resize/scroll/ResizeObserver, never per frame.
    let canvasRect = null;
    let scaleX = 1;
    let scaleY = 1;
    const layout = () => {
      const stageRect = stageEl.getBoundingClientRect();
      const target = canvas || stageEl;
      const rect = target.getBoundingClientRect();
      canvasRect = rect;
      if (canvas && rect.width && rect.height) {
        scaleX = canvas.width / rect.width;
        scaleY = canvas.height / rect.height;
      }
      // Keep the frame above a mobile bottom sheet (settingsToggle.js sets --ag-sheet-h).
      const sheet = document.body.classList.contains("ag-sheet")
        ? parseFloat(getComputedStyle(root).getPropertyValue("--ag-sheet-h")) || 0
        : 0;
      const visibleBottom = Math.min(rect.bottom, window.innerHeight - sheet);
      const height = Math.max(0, visibleBottom - rect.top);
      // Too little room left (sheet open at full): keep only the marks.
      box.classList.toggle("ag-hud--cramped", height < 140);
      if (isReplaced) {
        box.style.left = `${rect.left}px`;
        box.style.top = `${rect.top}px`;
        box.style.width = `${rect.width}px`;
        box.style.height = `${height}px`;
        frameEl.style.cssText = `left:0;top:0;width:${rect.width}px;height:${height}px`;
      } else {
        frameEl.style.cssText = `left:${rect.left - stageRect.left - stageEl.clientLeft}px;top:${rect.top - stageRect.top - stageEl.clientTop}px;width:${rect.width}px;height:${height}px`;
      }
      // Ruler ticks every 10 canvas px (100 when that gets too dense).
      let tickPx = canvas ? 10 / scaleX : 10;
      if (tickPx < 4) {
        tickPx *= 10;
      }
      frameEl.style.setProperty("--ag-tick", `${tickPx}px`);
      lastPointerText = "";
      if (sizeLine) {
        setText(sizeLine.value, `${fmt(canvas.width, 0, 4)} × ${fmt(canvas.height, 0, 4)}`);
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
    if (typeof ResizeObserver === "function") {
      observer = new ResizeObserver(queueLayout);
      observer.observe(stageEl);
      if (canvas && canvas !== stageEl) {
        observer.observe(canvas);
      }
    }
    layout();

    // Pointer, in client coordinates; mapped at text-update time.
    const onPointer = (event) => {
      clientX = event.clientX;
      clientY = event.clientY;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });

    // Timing.
    let start = performance.now();
    let appFrames = 0;
    let usesAppFrames = false;
    let windowFrames = 0;
    let windowStart = start;
    let lastText = 0;
    let fps = 0;
    let lastCanvasW = canvas ? canvas.width : 0;
    let lastCanvasH = canvas ? canvas.height : 0;
    let raf = 0;
    let alive = true;

    const update = (now) => {
      if (sizeLine && (canvas.width !== lastCanvasW || canvas.height !== lastCanvasH)) {
        lastCanvasW = canvas.width;
        lastCanvasH = canvas.height;
        layout();
      }
      if (pointerLine) {
        let text = "X ---- · Y ----";
        if (canvasRect && clientX >= canvasRect.left && clientX <= canvasRect.right && clientY >= canvasRect.top && clientY <= canvasRect.bottom) {
          text = `X ${fmt(Math.floor((clientX - canvasRect.left) * scaleX), 0, 4)} · Y ${fmt(Math.floor((clientY - canvasRect.top) * scaleY), 0, 4)}`;
        }
        if (text !== lastPointerText) {
          lastPointerText = text;
          setText(pointerLine.value, text);
        }
      }
      if (fpsLine && now - windowStart >= 500) {
        fps = (windowFrames * 1000) / (now - windowStart);
        windowFrames = 0;
        windowStart = now;
        setText(fpsLine.value, fmt(fps, 0, 2));
      }
      if (timeLine) {
        const t = (now - start) / 1000;
        const minutes = Math.floor(t / 60);
        setText(timeLine.value, `${fmt(minutes, 0, 2)}:${fmt(t - minutes * 60, 2, 2)}`);
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
      element: box,
      get specimen() {
        return code ? specimenId(code, specimen) : "";
      },
      set(key, value, unit, slot) {
        let entry = custom.get(key);
        if (value === null || value === undefined) {
          if (entry) {
            entry.row.remove();
            custom.delete(key);
          }
          return api;
        }
        if (!entry) {
          entry = line(slot || "tr", key, unit);
          custom.set(key, entry);
        } else if (unit !== undefined) {
          setText(entry.unit, unit || "");
          entry.unit.parentNode.hidden = !unit;
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
            frameLine = line(place.timing, "F");
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
        box.remove();
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
    const pad = opts.pad !== false;
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
