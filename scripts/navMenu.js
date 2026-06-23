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

  // Default static links
  const staticLinks = [
    { name: "Home", url: "index.html" },
    { name: "About", url: "about.html" },
    { name: "Archive", url: "archive.html" },
    { name: "Gallery", url: "gallery.html" },
    { name: "Inspiration", url: "inspiration.html" }
  ];

  staticLinks.forEach(link => {
    const a = document.createElement("a");
    a.textContent = link.name;
    a.href = resolvePath(link.url);
    dropdown.appendChild(a);
  });

  // Build nav list from APP_LINKS if available
  if (window.APP_LINKS) {
    const navApps = window.APP_LINKS.filter(app => !app.archived).slice(0, 5);
    navApps.forEach(link => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = resolvePath(link.url);
      a.textContent = link.name;
      li.appendChild(a);
      navList.appendChild(li);
    });
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
  menuBtn.addEventListener("pointerenter", () => {
    if (!menuPinnedOpen) setMenuOpen(true, false);
  });

  header.addEventListener("pointerleave", () => {
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
  const stretchLabelObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      wrapStretchLabels(mutation.target);
      mutation.addedNodes.forEach(wrapStretchLabels);
    });
  });
  stretchLabelObserver.observe(header, { childList: true, subtree: true });
});









if (
  !document.body.classList.contains("isolation-page") &&
  window.matchMedia("(pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  // Number of trail elements
  const trailCount = 10;
  const trailElements = [];

  // Create trail elements
  for (let i = 0; i < trailCount; i++) {
    const div = document.createElement('div');
    div.classList.add('cursor-trail');
    document.body.appendChild(div);
    trailElements.push({ el: div, x: 0, y: 0 });
  }

  let targetX = 0;
  let targetY = 0;
  let trailFrame = 0;

  const renderTrail = () => {
    let previousX = targetX;
    let previousY = targetY;
    let stillMoving = false;
    trailElements.forEach((trail, i) => {
      const follow = i === 0 ? 0.42 : 0.3;
      trail.x += (previousX - trail.x) * follow;
      trail.y += (previousY - trail.y) * follow;
      if (Math.abs(previousX - trail.x) > 0.1 || Math.abs(previousY - trail.y) > 0.1) stillMoving = true;
      previousX = trail.x;
      previousY = trail.y;
      trail.el.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0)`;
      trail.el.style.opacity = `${1 - i / trailCount}`;
    });
    trailFrame = stillMoving ? requestAnimationFrame(renderTrail) : 0;
  };

  document.addEventListener('mousemove', e => {
    targetX = e.clientX;
    targetY = e.clientY;
    if (!trailFrame) trailFrame = requestAnimationFrame(renderTrail);
  }, { passive: true });
}
