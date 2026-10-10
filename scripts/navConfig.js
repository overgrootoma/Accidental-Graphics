// navConfig.js
// Loads the site content from content/*.json (edited in Pages CMS, see .pages.yml).
// Every page includes this file, so the menu and the pages share one list of tools.
(function () {
  const script = document.currentScript;
  const siteRoot = script?.src ? new URL("../", script.src) : new URL("./", document.baseURI);

  // Paths in the content are relative to the site root ("images/covers/swing.mp4").
  // A leading slash is ignored, so the site also works in a subfolder on GitHub Pages.
  const resolve = path => {
    if (!path) return "";
    if (/^[a-z]+:/i.test(path)) return path;
    return new URL(String(path).replace(/^\/+/, ""), siteRoot).href;
  };

  const storageKey = name => `ag-content:${name}`;

  const readStored = name => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey(name)));
    } catch (_) {
      return null;
    }
  };

  const requests = {};
  const load = name => {
    if (!requests[name]) {
      requests[name] = fetch(resolve(`content/${name}.json`), { cache: "no-cache" })
        .then(res => {
          if (!res.ok) throw new Error(`content/${name}.json: ${res.status}`);
          return res.json();
        })
        .then(data => {
          try {
            sessionStorage.setItem(storageKey(name), JSON.stringify(data));
          } catch (_) {}
          return data;
        })
        .catch(err => {
          const stored = readStored(name);
          if (stored) return stored;
          throw err;
        });
    }
    return requests[name];
  };

  const toTools = data =>
    (Array.isArray(data?.tools) ? data.tools : [])
      .filter(tool => tool && tool.name && tool.link && !tool.hidden)
      .map(tool => ({
        name: String(tool.name),
        url: resolve(tool.link),
        year: tool.year ? String(tool.year) : "",
        cover: resolve(tool.cover),
        isVideo: /\.(mp4|webm|mov|m4v)$/i.test(tool.cover || ""),
        description: tool.description || "",
        archived: Boolean(tool.archived),
        inMenu: Boolean(tool.in_menu),
      }));

  window.AGContent = {
    resolve,
    load,
    stored: readStored,
    tools: () => load("tools").then(toTools),
    storedTools: () => {
      const stored = readStored("tools");
      return stored ? toTools(stored) : null;
    },
  };
})();
