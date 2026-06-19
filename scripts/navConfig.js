// navConfig.js
const ACTIVE_APPS = [
  { name: "Color Range Lab", url: "apps/ColorRangeLab.html", year: 2025 },
  { name: "MotionStills", url: "apps/MotionStills.html", year: 2025 },
  { name: "Swing", url: "apps/Swing.html", year: 2025 },
  { name: "IMAGEine", url: "apps/IMAGEine.html", year: 2025 },
  { name: "PhotoGrid", url: "apps/fotogrid.html", year: 2025 },
];

const ARCHIVE_APPS = [
  { name: "MotionDrawing", url: "archiveApps/motion_tracker.html", year: 2025 },
  { name: "ButtonEdit", url: "archiveApps/buttonedit.html", year: 2025 },
  { name: "Two-Image Mixer", url: "archiveApps/2images.html", year: 2025 },
  { name: "Selectorman", url: "archiveApps/selectorman.html", year: 2025 },
];

window.APP_MAP = {
  active: ACTIVE_APPS,
  archive: ARCHIVE_APPS,
};

window.APP_LINKS = [
  ...ACTIVE_APPS.map(app => ({ ...app, archived: false })),
  ...ARCHIVE_APPS.map(app => ({ ...app, archived: true })),
];
