// Smoke test: opens every page of the site in headless Chromium and reports
// JavaScript errors, console errors and files that fail to load (4xx/5xx).
//
//   python3 -m http.server 8765      (in the site folder, keep it running)
//   node tools/smoke-test.js         (in a second terminal)
//
// Options: BASE=http://localhost:8765/ node tools/smoke-test.js [page.html ...]
// Needs Playwright (preinstalled in Claude's cloud sessions; locally: npm i -g playwright).
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = (process.env.BASE || "http://localhost:8765/").replace(/\/?$/, "/");
const root = path.join(__dirname, "..");

function allPages() {
  const statics = ["index.html", "archive.html", "gallery.html", "about.html", "inspiration.html"];
  const tools = JSON.parse(fs.readFileSync(path.join(root, "content/tools.json"), "utf8")).tools
    .map(t => t.link)
    .filter(link => link && !/^[a-z]+:/i.test(link));
  return [...statics, ...tools];
}

(async () => {
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : allPages();
  const browser = await chromium.launch();
  let failed = 0;
  for (const p of pages) {
    const page = await browser.newPage();
    const problems = [];
    page.on("pageerror", e => problems.push(`JS error: ${e.message}`));
    page.on("console", m => {
      if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) problems.push(`console: ${m.text()}`);
    });
    page.on("response", r => {
      if (r.status() >= 400) problems.push(`${r.status()} ${decodeURI(r.url().replace(BASE, ""))}`);
    });
    try {
      await page.goto(BASE + p, { waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(1000);
    } catch (e) {
      problems.push(String(e.message || e));
    }
    console.log(`${problems.length ? "FAIL" : "ok  "}  ${p}`);
    problems.forEach(msg => console.log(`        ${msg}`));
    if (problems.length) failed++;
    await page.close();
  }
  await browser.close();
  console.log(`\n${pages.length - failed}/${pages.length} pages clean`);
  process.exit(failed ? 1 : 0);
})();
