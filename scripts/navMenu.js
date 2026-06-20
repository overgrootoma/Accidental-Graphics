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
  const menuBtn = document.createElement("div");
  menuBtn.id = "hamburgerMenu";
  menuBtn.innerHTML = "&#9776;"; // ☰ symbol

  // Dropdown menu
  const dropdown = document.createElement("div");
  dropdown.id = "menuDropdown";

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

  // Toggle dropdown visibility
  menuBtn.addEventListener("click", () => {
    dropdown.style.display = dropdown.style.display === "none" ? "flex" : "none";
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", e => {
    if (!header.contains(e.target)) dropdown.style.display = "none";
  });

  // Append elements to header
  header.appendChild(nav);
  header.appendChild(menuBtn);
  header.appendChild(dropdown);

  // Add header to body
  document.body.prepend(header);

  const stretchTargetSelector = [
    "button",
    ".file-button",
    ".gallery-action",
    ".home-gallery-link",
    ".site-nav a"
  ].join(",");

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

  wrapStretchLabels(document.body);
  const stretchLabelObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      wrapStretchLabels(mutation.target);
      mutation.addedNodes.forEach(wrapStretchLabels);
    });
  });
  stretchLabelObserver.observe(document.body, { childList: true, subtree: true });
});









if (!document.body.classList.contains("isolation-page")) {
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

  // Track mouse
  document.addEventListener('mousemove', e => {
    const x = e.clientX;
    const y = e.clientY;

    trailElements.forEach((trail, i) => {
      setTimeout(() => {
        trail.el.style.transform = `translate(${x}px, ${y}px)`;
        trail.el.style.opacity = `${1 - i / trailCount}`; // fade out
      }, i * 30); // stagger delay for trailing effect
    });
  });
}
