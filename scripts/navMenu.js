const navMenuScript = document.currentScript;

document.addEventListener("DOMContentLoaded", () => {
  const siteRoot = navMenuScript?.src
    ? new URL("../", navMenuScript.src)
    : new URL("./", document.baseURI);
  const resolvePath = path => new URL(path, siteRoot).href;
  // Create header
  const header = document.createElement("header");
  header.classList.add("site-nav");

  // Create nav container
  const nav = document.createElement("nav");
  const logoLink = document.createElement("a");
  logoLink.href = resolvePath("index.html");
  logoLink.className = "nav-logo";
  logoLink.setAttribute("aria-label", "Accidental Graphics home");
  logoLink.innerHTML = `<img src="${resolvePath("images/big head.png")}" alt="Accidental Graphics">`;
  nav.appendChild(logoLink);
  const navList = document.createElement("ul");
  navList.id = "navLinks";
  nav.appendChild(navList);

  // Hamburger button
  const menuBtn = document.createElement("button");
  menuBtn.id = "hamburgerMenu";
  menuBtn.type = "button";
  menuBtn.setAttribute("aria-label", "Open navigation menu");
  menuBtn.setAttribute("aria-controls", "menuDropdown");
  menuBtn.setAttribute("aria-expanded", "false");
  const menuIcon = document.createElement("span");
  menuIcon.className = "hamburger-icon";
  menuIcon.textContent = "☰";
  menuBtn.appendChild(menuIcon);

  // Dropdown menu
  const dropdown = document.createElement("div");
  dropdown.id = "menuDropdown";
  dropdown.setAttribute("aria-label", "Site navigation");

  // Default static links (inspiration.html still exists, but is no longer linked)
  const staticLinks = [
    { name: "Home", url: "index.html" },
    { name: "About", url: "about.html" },
    { name: "Archive", url: "archive.html" },
    { name: "Gallery", url: "gallery.html" }
  ];

  staticLinks.forEach((link, index) => {
    const a = document.createElement("a");
    a.style.setProperty("--i", index);
    a.textContent = link.name;
    a.href = resolvePath(link.url);
    dropdown.appendChild(a);
  });

  // Tools in the top bar come from content/tools.json ("Show in the top bar" in the CMS).
  // The last known list is drawn right away so the bar doesn't flicker between pages.
  let renderedNav = "";
  const renderNavTools = tools => {
    const navTools = tools.filter(tool => tool.inMenu && !tool.archived);
    const signature = JSON.stringify(navTools.map(tool => [tool.name, tool.url]));
    if (signature === renderedNav) return;
    renderedNav = signature;
    navList.innerHTML = "";
    navTools.forEach(tool => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = tool.url;
      a.textContent = tool.name;
      li.appendChild(a);
      navList.appendChild(li);
    });
  };

  if (window.AGContent) {
    const storedTools = window.AGContent.storedTools();
    if (storedTools) renderNavTools(storedTools);
    window.AGContent.tools().then(renderNavTools).catch(() => {});
  }

  let menuPinnedOpen = false;

  const setMenuOpen = (isOpen, pinned = menuPinnedOpen) => {
    menuPinnedOpen = pinned;
    dropdown.classList.toggle("is-open", isOpen);
    menuBtn.classList.toggle("is-open", menuPinnedOpen);
    menuBtn.setAttribute("aria-expanded", String(isOpen));
    menuBtn.setAttribute("aria-label", menuPinnedOpen ? "Close navigation menu" : "Open navigation menu");
    menuIcon.textContent = menuPinnedOpen ? "×" : "☰";
  };

  // Preview on hover; pin the menu open on click.
  // Touch has no hover: a tap only toggles the pinned state (pointerenter/leave would flicker it).
  menuBtn.addEventListener("pointerenter", event => {
    if (event.pointerType === "touch") return;
    if (!menuPinnedOpen) setMenuOpen(true, false);
  });

  header.addEventListener("pointerleave", event => {
    if (event.pointerType === "touch") return;
    if (!menuPinnedOpen) setMenuOpen(false, false);
  });

  menuBtn.addEventListener("click", () => {
    setMenuOpen(!menuPinnedOpen, !menuPinnedOpen);
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", e => {
    if (!header.contains(e.target)) setMenuOpen(false, false);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      const wasOpen = dropdown.classList.contains("is-open");
      setMenuOpen(false, false);
      if (wasOpen) menuBtn.focus();
    }
  });

  // Append elements to header
  header.appendChild(nav);
  header.appendChild(menuBtn);
  header.appendChild(dropdown);

  // Add header to body
  document.body.prepend(header);

  // Live "lab notebook" strip in the footer of the site pages (.app-year[data-live]): only real, measured values
  // (no permission prompts): local time, viewport, pointer position / speed, page load time, tool count,
  // last-modified date, scroll position, session time, rendered fps, pixel ratio, colour scheme, connection type.
  function initLiveStrip() {
    const bar = document.querySelector(".app-year[data-live]");
    if (!bar) return;
    const pad = (n, w = 2) => String(Math.round(n)).padStart(w, "0");
    const label = document.createElement("span");
    label.className = "app-year__label";
    label.textContent = bar.textContent.trim();
    const data = document.createElement("span");
    data.className = "app-year__data";
    const items = {};
    // Order = display order; the last items are dropped first when the line gets too wide.
    const defs = [["time", "LOCAL"], ["vp", "VP"], ["ptr", "PTR"], ["load", "LOAD"], ["tools", "TOOLS"], ["upd", "UPD"],
      ["scroll", "SCR"], ["spd", "SPD"], ["t", "T+"], ["fps", "FPS"], ["dpr", "DPR"], ["scheme", "SCHEME"], ["net", "NET"]];
    defs.forEach(([key, name]) => {
      const item = document.createElement("span");
      item.className = `app-year__item app-year__item--${key}`;
      const k = document.createElement("span");
      k.className = "app-year__key";
      k.textContent = name;
      const v = document.createElement("span");
      v.className = "app-year__value";
      item.append(k, v);
      data.appendChild(item);
      items[key] = v;
      items[key].item = item;
    });
    bar.textContent = "";
    bar.append(label, data);

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn || !conn.effectiveType) items.net.item.hidden = true;
    const dark = window.matchMedia("(prefers-color-scheme: dark)");

    // Hides the lowest-priority items until the line fits without overflow.
    const fit = () => {
      const all = [...data.children].filter(el => !el.hidden);
      all.forEach(el => { el.style.display = ""; });
      for (let i = all.length - 1; i > 0 && data.scrollWidth > data.clientWidth + 1; i--) all[i].style.display = "none";
    };
    const setViewport = () => {
      items.vp.textContent = `${pad(window.innerWidth, 4)}×${pad(window.innerHeight, 4)}`;
      items.dpr.textContent = `${window.devicePixelRatio.toFixed(2)}X`;
      fit();
    };
    const setScroll = () => {
      const root = document.scrollingElement || document.documentElement;
      const max = root.scrollHeight - root.clientHeight;
      items.scroll.textContent = `${pad(max > 0 ? Math.min(100, root.scrollTop / max * 100) : 0, 3)}%`;
    };
    const setScheme = () => { items.scheme.textContent = dark.matches ? "DARK" : "LIGHT"; };
    const setNet = () => {
      if (conn && conn.effectiveType) items.net.textContent = conn.effectiveType.toUpperCase();
    };
    setViewport();
    setScroll();
    setScheme();
    setNet();
    items.ptr.textContent = "----,----";
    items.spd.textContent = "0000 PX/S";
    items.load.textContent = "---- MS";
    items.tools.textContent = "--";
    items.fps.textContent = "--";
    items.t.textContent = "00:00";
    const modified = new Date(document.lastModified);
    items.upd.textContent = isNaN(modified) ? "----" : `${modified.getFullYear()}-${pad(modified.getMonth() + 1)}-${pad(modified.getDate())}`;
    window.addEventListener("resize", () => { setViewport(); setScroll(); });
    window.addEventListener("scroll", setScroll, { passive: true });
    if (dark.addEventListener) dark.addEventListener("change", setScheme);
    if (conn && conn.addEventListener) conn.addEventListener("change", setNet);

    // Pointer position (per frame) and speed (px/s over the last tick).
    let pointerFrame = 0;
    let px = 0;
    let py = 0;
    let travelled = 0;
    let lastX = null;
    let lastY = 0;
    window.addEventListener("pointermove", event => {
      px = event.clientX;
      py = event.clientY;
      if (lastX !== null) travelled += Math.hypot(px - lastX, py - lastY);
      lastX = px;
      lastY = py;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        items.ptr.textContent = `${pad(px, 4)},${pad(py, 4)}`;
      });
    }, { passive: true });

    // Rendered frames of the page (rAF count), refreshed together with clock, session time and pointer speed.
    let frames = 0;
    const countFrame = () => { frames++; requestAnimationFrame(countFrame); };
    requestAnimationFrame(countFrame);
    const start = performance.now();
    let last = start;
    const tick = () => {
      const now = performance.now();
      const dt = Math.max(1, now - last);
      last = now;
      const d = new Date();
      items.time.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      const secs = Math.floor((now - start) / 1000);
      items.t.textContent = `${pad(secs / 60)}:${pad(secs % 60)}`;
      items.fps.textContent = pad(frames * 1000 / dt);
      items.spd.textContent = `${pad(travelled * 1000 / dt, 4)} PX/S`;
      frames = 0;
      travelled = 0;
      fit();
    };
    setInterval(tick, 500);

    const setLoad = () => {
      const nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      const ms = nav && nav.loadEventEnd > 0 ? nav.loadEventEnd : performance.now();
      items.load.textContent = `${pad(ms, 4)} MS`;
      fit();
    };
    if (document.readyState === "complete") setTimeout(setLoad, 0);
    else window.addEventListener("load", () => setTimeout(setLoad, 0), { once: true });

    if (window.AGContent) {
      window.AGContent.tools().then(tools => {
        items.tools.textContent = pad(tools.filter(tool => !tool.archived).length);
        fit();
      }).catch(() => {});
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  const stretchTargetSelector = ".site-nav a";

  const wrapStretchLabels = root => {
    const targets = [];
    if (root.nodeType === Node.ELEMENT_NODE && root.matches(stretchTargetSelector)) {
      targets.push(root);
    }
    if (root.querySelectorAll) {
      targets.push(...root.querySelectorAll(stretchTargetSelector));
    }

    targets.forEach(target => {
      [...target.childNodes].forEach(node => {
        if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) return;
        const label = document.createElement("span");
        label.className = "stretch-text";
        label.textContent = node.textContent;
        node.replaceWith(label);
      });
    });
  };

  wrapStretchLabels(header);
  initLiveStrip();
  const stretchLabelObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      wrapStretchLabels(mutation.target);
      mutation.addedNodes.forEach(wrapStretchLabels);
    });
  });
  stretchLabelObserver.observe(header, { childList: true, subtree: true });
});
