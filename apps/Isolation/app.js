(function () {
  "use strict";

  const CM_PER_INCH = 2.54;
  const MAX_PIXELS = 36_000_000;
  const MAX_PATHS = 120;
  const MAX_POINTS_PER_PATH = 1800;
  const MAX_CUSTOM_ISOLATION_POINTS = 900;
  const MAX_IMAGE_RUNS = 150000;
  const MAX_ISOLATIONS = 48;
  const GRID_SIZE_MIN = 9;
  const GRID_SIZE_MAX = 201;
  const STORAGE_KEY = "isolation-field-state";
  // Screen sizes use 72 dpi so the pixel size comes out exact.
  const CANVAS_PRESETS = {
    square: { widthCm: pxToCm(1080, 72), heightCm: pxToCm(1080, 72), dpi: 72 },
    portrait: { widthCm: pxToCm(1080, 72), heightCm: pxToCm(1350, 72), dpi: 72 },
    story: { widthCm: pxToCm(1080, 72), heightCm: pxToCm(1920, 72), dpi: 72 },
    landscape: { widthCm: pxToCm(1920, 72), heightCm: pxToCm(1080, 72), dpi: 72 },
    a4: { widthCm: 21, heightCm: 29.7, dpi: 300 },
    a3: { widthCm: 29.7, heightCm: 42, dpi: 300 },
  };
  // Object width and height are % of the shorter grid side, so a circle stays round on any canvas.
  const ISO_SIZE_MIN = 3;
  const ISO_SIZE_MAX = 200;
  const HISTORY_LIMIT = 100;
  const HISTORY_MERGE_MS = 1000;

  const DEFAULT_STATE = {
    isolationModelVersion: 6,
    widthCm: 25,
    heightCm: 25,
    dpi: 300,
    showGrid: false,
    gridSize: 25,
    reaction: 78,
    lineFillColor: "#ffffff",
    lineColor: "#000000",
    lineCap: "round",
    lineJoin: "round",
    randomLineCount: 28,
    randomLineLength: 10,
    paperColor: "#ffffff",
    transparentPaper: false,
    transparentDrawing: false,
    drawFill: true,
    drawStroke: true,
    fillWeight: 16,
    strokeWeight: 1.2,
    imageThreshold: 128,
    imageDetail: 5,
    imageScale: 100,
    imageOffsetX: 0,
    imageOffsetY: 0,
    imageBrightness: 0,
    imageContrast: 0,
    imageInvert: false,
    imageLinesHorizontal: true,
    imageLinesVertical: true,
    imageLinesDiagonal: true,
    showImage: false,
    paths: [],
    selectedIsolationId: "iso-1",
    isolations: [
      {
        id: "iso-1",
        enabled: true,
        outline: true,
        fill: true,
        fillColor: "#00ff00",
        lockAspect: false,
        aspectRatio: 1,
        shape: "circle",
        x: 0.5,
        y: 0.5,
        width: 17,
        height: 17,
        rotation: 0,
        force: 100,
        gap: 10,
        strokeColor: "#00ff00",
        strokeWidth: 1.2,
        customPath: [],
      },
    ],
  };

  const canvas = document.getElementById("workCanvas");
  const ctx = canvas.getContext("2d", { alpha: true });

  const els = {
    randomizeAll: document.getElementById("randomizeAll"),
    resetAllTop: document.getElementById("resetAllTop"),
    randomizeGridSettings: document.getElementById("randomizeGridSettings"),
    randomizeDrawSettings: document.getElementById("randomizeDrawSettings"),
    randomizeImageSettings: document.getElementById("randomizeImageSettings"),
    randomizeIsolationSettings: document.getElementById("randomizeIsolationSettings"),
    randomizeCanvasSettings: document.getElementById("randomizeCanvasSettings"),
    randomizeSurfaceSettings: document.getElementById("randomizeSurfaceSettings"),
    randomizeKeepColors: document.getElementById("randomizeKeepColors"),
    showGrid: document.getElementById("showGrid"),
    gridSize: document.getElementById("gridSize"),
    gridSizeValue: document.getElementById("gridSizeValue"),
    reaction: document.getElementById("reaction"),
    reactionValue: document.getElementById("reactionValue"),
    drawFill: document.getElementById("drawFill"),
    lineFillColor: document.getElementById("lineFillColor"),
    fillWeight: document.getElementById("fillWeight"),
    fillWeightValue: document.getElementById("fillWeightValue"),
    drawStroke: document.getElementById("drawStroke"),
    lineColor: document.getElementById("lineColor"),
    strokeWeight: document.getElementById("strokeWeight"),
    strokeWeightValue: document.getElementById("strokeWeightValue"),
    lineCap: document.getElementById("lineCap"),
    lineJoin: document.getElementById("lineJoin"),
    randomLineCount: document.getElementById("randomLineCount"),
    randomLineCountValue: document.getElementById("randomLineCountValue"),
    randomLineLength: document.getElementById("randomLineLength"),
    randomLineLengthValue: document.getElementById("randomLineLengthValue"),
    undoLine: document.getElementById("undoLine"),
    clearLines: document.getElementById("clearLines"),
    randomizeDrawing: document.getElementById("randomizeDrawing"),
    imageImport: document.getElementById("imageImport"),
    imageLinesHorizontal: document.getElementById("imageLinesHorizontal"),
    imageLinesVertical: document.getElementById("imageLinesVertical"),
    imageLinesDiagonal: document.getElementById("imageLinesDiagonal"),
    imageThreshold: document.getElementById("imageThreshold"),
    imageThresholdValue: document.getElementById("imageThresholdValue"),
    imageDetail: document.getElementById("imageDetail"),
    imageDetailValue: document.getElementById("imageDetailValue"),
    imageScale: document.getElementById("imageScale"),
    imageScaleValue: document.getElementById("imageScaleValue"),
    imageOffsetX: document.getElementById("imageOffsetX"),
    imageOffsetXValue: document.getElementById("imageOffsetXValue"),
    imageOffsetY: document.getElementById("imageOffsetY"),
    imageOffsetYValue: document.getElementById("imageOffsetYValue"),
    imageBrightness: document.getElementById("imageBrightness"),
    imageBrightnessValue: document.getElementById("imageBrightnessValue"),
    imageContrast: document.getElementById("imageContrast"),
    imageContrastValue: document.getElementById("imageContrastValue"),
    imageInvert: document.getElementById("imageInvert"),
    showImage: document.getElementById("showImage"),
    clearImage: document.getElementById("clearImage"),
    imageStatus: document.getElementById("imageStatus"),
    isolationSelect: document.getElementById("isolationSelect"),
    isolationEnabled: document.getElementById("isolationEnabled"),
    isolationOutline: document.getElementById("isolationOutline"),
    addIsolation: document.getElementById("addIsolation"),
    removeIsolation: document.getElementById("removeIsolation"),
    isolationShape: document.getElementById("isolationShape"),
    isolationX: document.getElementById("isolationX"),
    isolationY: document.getElementById("isolationY"),
    isolationWidth: document.getElementById("isolationWidth"),
    isolationWidthValue: document.getElementById("isolationWidthValue"),
    isolationWidthNumber: document.getElementById("isolationWidthNumber"),
    isolationHeight: document.getElementById("isolationHeight"),
    isolationHeightValue: document.getElementById("isolationHeightValue"),
    isolationHeightNumber: document.getElementById("isolationHeightNumber"),
    isolationLockAspect: document.getElementById("isolationLockAspect"),
    isolationRatioNumber: document.getElementById("isolationRatioNumber"),
    isolationRotation: document.getElementById("isolationRotation"),
    isolationRotationValue: document.getElementById("isolationRotationValue"),
    isolationForce: document.getElementById("isolationForce"),
    isolationForceValue: document.getElementById("isolationForceValue"),
    isolationGap: document.getElementById("isolationGap"),
    isolationGapValue: document.getElementById("isolationGapValue"),
    isolationFill: document.getElementById("isolationFill"),
    isolationFillColor: document.getElementById("isolationFillColor"),
    isolationStrokeColor: document.getElementById("isolationStrokeColor"),
    isolationStrokeWidth: document.getElementById("isolationStrokeWidth"),
    isolationStrokeWidthValue: document.getElementById("isolationStrokeWidthValue"),
    centerIsolation: document.getElementById("centerIsolation"),
    randomIsolation: document.getElementById("randomIsolation"),
    drawIsolationShape: document.getElementById("drawIsolationShape"),
    clearIsolationShape: document.getElementById("clearIsolationShape"),
    isolationDrawStatus: document.getElementById("isolationDrawStatus"),
    widthCm: document.getElementById("widthCm"),
    heightCm: document.getElementById("heightCm"),
    dpi: document.getElementById("dpi"),
    viewScale: document.getElementById("viewScale"),
    applySize: document.getElementById("applySize"),
    canvasPreset: document.getElementById("canvasPreset"),
    pixelSize: document.getElementById("pixelSize"),
    paperColor: document.getElementById("paperColor"),
    transparentPaper: document.getElementById("transparentPaper"),
    transparentDrawing: document.getElementById("transparentDrawing"),
    exportPng: document.getElementById("exportPng"),
    shortcutsToggle: document.getElementById("shortcutsToggle"),
    shortcuts: document.getElementById("shortcuts"),
  };

  const state = loadState();
  const importedImage = {
    image: null,
    name: "",
    paths: [],
    dirty: false,
    key: "",
  };
  let raf = 0;
  const pointer = {
    down: false,
    mode: "",
    activePath: null,
    lastCell: "",
    offsetX: 0,
    offsetY: 0,
    hover: null,
  };
  let isolationDrawMode = false;
  const customIsolationDraft = {
    active: false,
    points: [],
  };
  const history = {
    undo: [],
    redo: [],
    current: null,
    burstKey: "",
    burstTime: 0,
  };

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    } catch (error) {
      return cloneDefaultState();
    }
  }

  function normalizeState(saved) {
    const base = cloneDefaultState();
    if (!saved || typeof saved !== "object") {
      return base;
    }

    const merged = {
      ...base,
      ...saved,
    };

    merged.gridSize = oddClamp(merged.gridSize, GRID_SIZE_MIN, GRID_SIZE_MAX, base.gridSize);
    merged.reaction = clampNumber(merged.reaction, 0, 100, base.reaction);
    merged.widthCm = clampNumber(merged.widthCm, 1, 120, base.widthCm);
    merged.heightCm = clampNumber(merged.heightCm, 1, 120, base.heightCm);
    merged.dpi = clampNumber(Math.round(merged.dpi), 72, 600, base.dpi);
    merged.fillWeight = clampNumber(merged.fillWeight, 1, 80, base.fillWeight);
    merged.strokeWeight = clampNumber(merged.strokeWeight, 0.2, 24, base.strokeWeight);
    merged.lineFillColor = validHex(merged.lineFillColor) ? merged.lineFillColor : base.lineFillColor;
    merged.lineColor = validHex(merged.lineColor) ? merged.lineColor : base.lineColor;
    merged.lineCap = validLineCap(merged.lineCap) ? merged.lineCap : base.lineCap;
    merged.lineJoin = validLineJoin(merged.lineJoin) ? merged.lineJoin : base.lineJoin;
    merged.randomLineCount = clampNumber(merged.randomLineCount, 4, 80, base.randomLineCount);
    merged.randomLineLength = clampNumber(merged.randomLineLength, 2, 40, base.randomLineLength);
    merged.paperColor = validHex(merged.paperColor) ? merged.paperColor : base.paperColor;
    merged.drawFill = Boolean(merged.drawFill);
    merged.drawStroke = Boolean(merged.drawStroke);
    merged.showGrid = Boolean(merged.showGrid);
    merged.transparentPaper = Boolean(merged.transparentPaper);
    merged.transparentDrawing = Boolean(merged.transparentDrawing);
    merged.imageThreshold = clampNumber(merged.imageThreshold, 0, 255, base.imageThreshold);
    merged.imageDetail = clampNumber(merged.imageDetail, 2, 8, base.imageDetail);
    merged.imageScale = clampNumber(merged.imageScale, 10, 250, base.imageScale);
    merged.imageOffsetX = clampNumber(merged.imageOffsetX, -50, 50, base.imageOffsetX);
    merged.imageOffsetY = clampNumber(merged.imageOffsetY, -50, 50, base.imageOffsetY);
    merged.imageBrightness = clampNumber(merged.imageBrightness, -100, 100, base.imageBrightness);
    merged.imageContrast = clampNumber(merged.imageContrast, -100, 100, base.imageContrast);
    merged.imageInvert = Boolean(merged.imageInvert);
    if (typeof saved.imageLinesHorizontal === "boolean" || typeof saved.imageLinesVertical === "boolean" || typeof saved.imageLinesDiagonal === "boolean") {
      merged.imageLinesHorizontal = Boolean(saved.imageLinesHorizontal);
      merged.imageLinesVertical = Boolean(saved.imageLinesVertical);
      merged.imageLinesDiagonal = Boolean(saved.imageLinesDiagonal);
    } else if (validImageLineDirection(saved.imageLineDirection)) {
      merged.imageLinesHorizontal = saved.imageLineDirection === "all" || saved.imageLineDirection === "horizontal";
      merged.imageLinesVertical = saved.imageLineDirection === "all" || saved.imageLineDirection === "vertical";
      merged.imageLinesDiagonal = saved.imageLineDirection === "all" || saved.imageLineDirection === "diagonal";
    }
    delete merged.imageLineDirection;
    merged.showImage = Boolean(merged.showImage);
    merged.paths = Array.isArray(saved.paths) ? saved.paths.slice(-MAX_PATHS).map(normalizePath).filter(Boolean) : [];
    delete merged.drawingTool;
    delete merged.toolSize;
    delete merged.toolComplexity;

    if (Array.isArray(saved.isolations) && saved.isolations.length) {
      merged.isolations = saved.isolations.slice(0, MAX_ISOLATIONS).map((item, index) => normalizeIsolation(item, index));
    } else {
      merged.isolations = [
        normalizeIsolation(
          {
            id: "iso-1",
            x: saved.isolation && Number.isFinite(Number(saved.isolation.x)) ? Number(saved.isolation.x) : 0.5,
            y: saved.isolation && Number.isFinite(Number(saved.isolation.y)) ? Number(saved.isolation.y) : 0.5,
            width: saved.isolationSize || 17,
            height: saved.isolationSize || 17,
            force: saved.isolationForce || base.isolations[0].force,
            gap: saved.isolationGap || 10,
            strokeColor: base.isolations[0].strokeColor,
            strokeWidth: saved.strokeWeight || 1.2,
          },
          0
        ),
      ];
    }

    const savedIsolationVersion = Number(saved.isolationModelVersion) || 0;
    if (savedIsolationVersion < 2) {
      merged.reaction = Math.max(merged.reaction, 78);
      merged.isolations = merged.isolations.map((item) => ({
        ...item,
        force: Math.max(item.force, 85),
        gap: Math.max(item.gap, 10),
      }));
    }
    if (savedIsolationVersion < 5) {
      merged.drawFill = true;
      merged.drawStroke = true;
      merged.lineFillColor = base.lineFillColor;
      merged.lineCap = base.lineCap;
      merged.lineJoin = base.lineJoin;
      merged.isolations = merged.isolations.map((item) => ({
        ...item,
        outline: true,
        fill: true,
        shape: "circle",
        height: item.width,
        aspectRatio: 1,
        force: Math.max(item.force, base.isolations[0].force),
        strokeColor: base.isolations[0].strokeColor,
      }));
    }
    if (savedIsolationVersion < 6) {
      // Up to version 5 width was % of the grid width and height % of the grid height.
      const pixels = getCanvasPixelSize(merged.widthCm, merged.heightCm, merged.dpi);
      const grid = getGridBox(pixels.width, pixels.height);
      const shortSide = Math.min(grid.width, grid.height);
      merged.isolations = merged.isolations.map((item) => {
        const width = clamp((item.width * grid.width) / shortSide, ISO_SIZE_MIN, ISO_SIZE_MAX);
        // Old circles were ovals on non-square canvases; they become real circles with the same width.
        const height = item.shape === "circle" ? width : clamp((item.height * grid.height) / shortSide, ISO_SIZE_MIN, ISO_SIZE_MAX);
        return {
          ...item,
          width,
          height,
          aspectRatio: item.shape === "circle" ? 1 : clampNumber(width / height, 0.05, 20, 1),
        };
      });
    }
    merged.isolationModelVersion = 6;

    if (!merged.isolations.some((item) => item.id === merged.selectedIsolationId)) {
      merged.selectedIsolationId = merged.isolations[0].id;
    }

    return merged;
  }

  function cloneDefaultState() {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function normalizePath(path) {
    if (!path || !Array.isArray(path.points)) {
      return null;
    }

    const points = path.points
      .map((point) => ({
        x: clampNumber(point && point.x, 0, 1, 0),
        y: clampNumber(point && point.y, 0, 1, 0),
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    return points.length ? { points: points.slice(0, MAX_POINTS_PER_PATH) } : null;
  }

  function handleImageImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      importedImage.image = image;
      importedImage.name = file.name;
      importedImage.paths = [];
      importedImage.dirty = true;
      importedImage.key = "";
      commitChange();
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      clearImportedImage();
    };
    image.src = url;
  }

  function clearImportedImage() {
    importedImage.image = null;
    importedImage.name = "";
    importedImage.paths = [];
    importedImage.dirty = false;
    importedImage.key = "";
    els.imageImport.value = "";
    commitChange();
  }

  function rebuildImportedImageIfNeeded(grid) {
    if (!importedImage.image) {
      return;
    }

    const key = [
      importedImage.image.naturalWidth || importedImage.image.width,
      importedImage.image.naturalHeight || importedImage.image.height,
      state.imageThreshold,
      state.imageDetail,
      state.imageScale,
      state.imageOffsetX,
      state.imageOffsetY,
      state.imageBrightness,
      state.imageContrast,
      state.imageInvert ? 1 : 0,
      state.imageLinesHorizontal ? 1 : 0,
      state.imageLinesVertical ? 1 : 0,
      state.imageLinesDiagonal ? 1 : 0,
      state.gridSize,
      Math.round(grid.width),
      Math.round(grid.height),
    ].join(":");

    if (!importedImage.dirty && importedImage.key === key) {
      return;
    }

    importedImage.paths = buildThresholdPaths(importedImage.image, grid);
    importedImage.dirty = false;
    importedImage.key = key;
    updateImageStatus();
  }

  // Samples the image on a lattice that lies exactly on the grid: Detail samples per grid cell,
  // so every grid row, column and diagonal gets exactly one line of samples.
  function buildThresholdPaths(image, grid) {
    const detail = Math.max(1, Math.round(state.imageDetail));
    const sampleWidth = (grid.columns - 1) * detail + 1;
    const sampleHeight = (grid.rows - 1) * detail + 1;
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sample = sampleCanvas.getContext("2d", { willReadFrequently: true });
    const placement = getImagePlacement(image, grid);

    // Pixel centre i sits at grid ratio i / (sampleWidth - 1).
    sample.clearRect(0, 0, sampleWidth, sampleHeight);
    sample.imageSmoothingEnabled = true;
    sample.imageSmoothingQuality = "high";
    sample.drawImage(
      image,
      placement.x * (sampleWidth - 1) + 0.5,
      placement.y * (sampleHeight - 1) + 0.5,
      placement.width * (sampleWidth - 1),
      placement.height * (sampleHeight - 1)
    );

    const data = sample.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const paths = [];
    const threshold = state.imageThreshold;

    const toNorm = (x, y) => ({
      x: x / (sampleWidth - 1),
      y: y / (sampleHeight - 1),
    });

    const addRuns = (starts, stepX, stepY) => {
      for (const start of starts) {
        let runStart = null;
        let lastActive = null;
        let x = start.x;
        let y = start.y;

        while (x >= 0 && x < sampleWidth && y >= 0 && y < sampleHeight) {
          const active = isThresholdPixelActive(data, (y * sampleWidth + x) * 4, threshold);

          if (active) {
            if (!runStart) {
              runStart = { x, y };
            }
            lastActive = { x, y };
          }

          if (!active && runStart) {
            pushThresholdRun(runStart, lastActive, toNorm, paths);
            runStart = null;
            lastActive = null;
            if (paths.length >= MAX_IMAGE_RUNS) {
              return true;
            }
          }

          x += stepX;
          y += stepY;
        }

        if (runStart) {
          pushThresholdRun(runStart, lastActive, toNorm, paths);
          if (paths.length >= MAX_IMAGE_RUNS) {
            return true;
          }
        }
      }

      return false;
    };

    const columnStarts = (y) => Array.from({ length: grid.columns }, (_, column) => ({ x: column * detail, y }));
    const rowStarts = (x) => Array.from({ length: grid.rows }, (_, row) => ({ x, y: row * detail }));
    const lastRow = sampleHeight - 1;

    if (state.imageLinesHorizontal && addRuns(rowStarts(0), 1, 0)) return paths;
    if (state.imageLinesVertical && addRuns(columnStarts(0), 0, 1)) return paths;
    if (state.imageLinesDiagonal) {
      // Down-right diagonals start on the top and left edge, up-right ones on the bottom and left edge.
      if (addRuns([...columnStarts(0), ...rowStarts(0).slice(1)], 1, 1)) return paths;
      if (addRuns([...columnStarts(lastRow), ...rowStarts(0).slice(0, -1)], 1, -1)) return paths;
    }

    return paths;
  }

  function getImagePlacement(image, grid) {
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const imageAspect = imageWidth / imageHeight;
    const gridAspect = grid.width / grid.height;
    let width = 1;
    let height = 1;

    if (imageAspect > gridAspect) {
      height = gridAspect / imageAspect;
    } else {
      width = imageAspect / gridAspect;
    }

    const imageScale = state.imageScale / 100;
    width *= imageScale;
    height *= imageScale;

    return {
      x: (1 - width) / 2 + state.imageOffsetX / 100,
      y: (1 - height) / 2 + state.imageOffsetY / 100,
      width,
      height,
    };
  }

  function pushThresholdRun(start, end, toNorm, paths) {
    const first = toNorm(start.x, start.y);
    const last = toNorm(end.x, end.y);
    paths.push({
      points: start.x === end.x && start.y === end.y ? [first] : [first, last],
    });
  }

  function isThresholdPixelActive(data, index, threshold) {
    const alpha = data[index + 3] / 255;
    if (alpha < 0.08) {
      return false;
    }

    const rawLuminance = data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
    const contrast = (259 * (state.imageContrast + 255)) / (255 * (259 - state.imageContrast));
    const luminance = clamp(contrast * (rawLuminance - 128) + 128 + state.imageBrightness * 2.55, 0, 255);
    return state.imageInvert ? luminance >= threshold : luminance <= threshold;
  }

  function updateImageStatus() {
    if (!importedImage.image) {
      els.imageStatus.textContent = "No image";
      return;
    }
    els.imageStatus.textContent = `${importedImage.name || "Image"} ${importedImage.paths.length}`;
  }

  function normalizeIsolation(item, index) {
    item = item || {};
    const validShapes = [
      "block",
      "circle",
      "diamond",
      "triangle",
      "hexagon",
      "hourglass",
      "wedge",
      "cross",
      "star",
      "blob",
      "custom",
    ];
    const shape = validShapes.includes(item.shape) ? item.shape : "block";
    const width = clampNumber(item.width || item.size, ISO_SIZE_MIN, ISO_SIZE_MAX, 17);
    const fallbackHeight = width;
    const height = shape === "circle" ? width : clampNumber(item.height, ISO_SIZE_MIN, ISO_SIZE_MAX, fallbackHeight);
    const aspectRatio = shape === "circle" ? 1 : clampNumber(item.aspectRatio || width / height, 0.05, 20, 1);

    return {
      id: item.id || `iso-${index + 1}`,
      enabled: item.enabled !== false,
      outline: item.outline !== false,
      fill: item.fill === true,
      fillColor: validHex(item.fillColor) ? item.fillColor : "#00ff00",
      lockAspect: item.lockAspect === true,
      aspectRatio,
      shape,
      x: clampNumber(item.x, 0, 1, 0.5),
      y: clampNumber(item.y, 0, 1, 0.5),
      width,
      height,
      rotation: clampNumber(item.rotation, -180, 180, 0),
      force: clampNumber(item.force, 0, 250, 100),
      gap: clampNumber(item.gap, 0, 35, 10),
      strokeColor: validHex(item.strokeColor) ? item.strokeColor : "#00ff00",
      strokeWidth: clampNumber(item.strokeWidth, 0.2, 24, 1.2),
      customPath: normalizeCustomIsolationPath(item.customPath),
    };
  }

  function normalizeCustomIsolationPath(points) {
    if (!Array.isArray(points)) {
      return [];
    }

    const output = points
      .map((point) => ({
        x: clampNumber(point && point.x, -1, 1, 0),
        y: clampNumber(point && point.y, -1, 1, 0),
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

    return output.length >= 3 ? output.slice(0, MAX_CUSTOM_ISOLATION_POINTS) : [];
  }

  function validHex(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  }

  function randomHexColor(random) {
    return `#${Math.floor(random() * 0x1000000)
      .toString(16)
      .padStart(6, "0")}`;
  }

  function validLineCap(value) {
    return ["butt", "square", "round"].includes(value);
  }

  function validLineJoin(value) {
    return ["miter", "bevel", "round"].includes(value);
  }

  function validImageLineDirection(value) {
    return ["all", "horizontal", "vertical", "diagonal"].includes(value);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // The app keeps working when browser storage is blocked.
    }
  }

  // Every change to the drawing goes through here: UI, render, storage and undo history stay in sync.
  // Pass merge (usually the control id) so one slider drag becomes one undo step.
  function commitChange(options) {
    options = options || {};
    if (options.image) {
      importedImage.dirty = true;
    }
    syncControls();
    scheduleRender();
    saveState();
    recordHistory(options.merge);
  }

  function makeSnapshot() {
    // Selecting another object is not a drawing change, so it is left out of the history.
    const { selectedIsolationId, ...drawing } = state;
    return {
      json: JSON.stringify(drawing),
      image: importedImage.image,
      name: importedImage.name,
    };
  }

  function recordHistory(mergeKey) {
    const next = makeSnapshot();
    const current = history.current;
    if (current && current.json === next.json && current.image === next.image) {
      return;
    }

    const now = performance.now();
    const merge = Boolean(mergeKey) && mergeKey === history.burstKey && now - history.burstTime < HISTORY_MERGE_MS;
    if (!merge && current) {
      history.undo.push(current);
      if (history.undo.length > HISTORY_LIMIT) {
        history.undo.shift();
      }
    }
    history.redo = [];
    history.current = next;
    history.burstKey = mergeKey || "";
    history.burstTime = now;
  }

  function endHistoryBurst() {
    history.burstKey = "";
  }

  function undo() {
    if (pointer.down || !history.undo.length) {
      return;
    }
    history.redo.push(history.current);
    restoreSnapshot(history.undo.pop());
  }

  function redo() {
    if (pointer.down || !history.redo.length) {
      return;
    }
    history.undo.push(history.current);
    restoreSnapshot(history.redo.pop());
  }

  function restoreSnapshot(snapshot) {
    const selectedId = state.selectedIsolationId;
    const saved = JSON.parse(snapshot.json);
    Object.keys(state).forEach((key) => {
      delete state[key];
    });
    Object.assign(state, saved);
    state.selectedIsolationId = state.isolations.some((item) => item.id === selectedId) ? selectedId : state.isolations[0].id;

    if (importedImage.image !== snapshot.image) {
      importedImage.image = snapshot.image;
      importedImage.name = snapshot.name;
      importedImage.paths = [];
      importedImage.dirty = true;
      importedImage.key = "";
      if (!snapshot.image) {
        els.imageImport.value = "";
      }
    }

    history.current = snapshot;
    endHistoryBurst();
    isolationDrawMode = false;
    customIsolationDraft.active = false;
    customIsolationDraft.points = [];
    syncControls();
    applyCanvasSize();
  }

  function pxToCm(px, dpi) {
    return Number(((px / dpi) * CM_PER_INCH).toFixed(3));
  }

  function getMatchingCanvasPreset() {
    const match = Object.keys(CANVAS_PRESETS).find((key) => {
      const preset = CANVAS_PRESETS[key];
      return preset.widthCm === state.widthCm && preset.heightCm === state.heightCm && preset.dpi === state.dpi;
    });
    return match || "custom";
  }

  function applyCanvasPreset(key) {
    const preset = CANVAS_PRESETS[key];
    if (!preset) {
      return;
    }
    Object.assign(state, preset);
    syncControls();
    applyCanvasSizeFromInputs();
  }

  function cmToPixels(cm, dpi) {
    return Math.max(1, Math.round((cm / CM_PER_INCH) * dpi));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? clamp(number, min, max) : fallback;
  }

  function oddClamp(value, min, max, fallback) {
    const clamped = Math.round(clampNumber(value, min, max, fallback));
    return clamped % 2 === 0 ? clamped + 1 : clamped;
  }

  function numberFromInput(input, fallback) {
    return clampNumber(input.value, Number(input.min || -Infinity), Number(input.max || Infinity), fallback);
  }

  function applyCanvasSize() {
    state.widthCm = numberFromInput(els.widthCm, state.widthCm);
    state.heightCm = numberFromInput(els.heightCm, state.heightCm);
    state.dpi = Math.round(numberFromInput(els.dpi, state.dpi));

    const { width, height, clamped } = getCanvasPixelSize(state.widthCm, state.heightCm, state.dpi);

    if (clamped) {
      const pxPerCm = state.dpi / CM_PER_INCH;
      state.widthCm = Number((width / pxPerCm).toFixed(2));
      state.heightCm = Number((height / pxPerCm).toFixed(2));
      els.widthCm.value = state.widthCm;
      els.heightCm.value = state.heightCm;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    updatePixelMeter();
    updateViewScale();
    scheduleRender();
    saveState();
  }

  function getCanvasPixelSize(widthCm, heightCm, dpi) {
    let width = cmToPixels(widthCm, dpi);
    let height = cmToPixels(heightCm, dpi);
    const pixelCount = width * height;
    if (pixelCount <= MAX_PIXELS) {
      return { width, height, clamped: false };
    }
    const ratio = Math.sqrt(MAX_PIXELS / pixelCount);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
    return { width, height, clamped: true };
  }

  function updatePixelMeter() {
    els.pixelSize.textContent = `${canvas.width} x ${canvas.height} px`;
  }

  function updateViewScale() {
    if (els.viewScale.value === "contain") {
      fitCanvasToStage();
    } else {
      fitCanvasToStage(Number(els.viewScale.value));
    }
  }

  function fitCanvasToStage(requestedScale) {
    const shell = canvas.parentElement.getBoundingClientRect();
    const fitScale = Math.min(shell.width / canvas.width, shell.height / canvas.height);
    const scale = Number.isFinite(requestedScale) ? Math.min(requestedScale, fitScale) : fitScale;
    canvas.style.width = `${Math.max(1, Math.floor(canvas.width * scale))}px`;
    canvas.style.height = `${Math.max(1, Math.floor(canvas.height * scale))}px`;
  }

  function syncControls() {
    els.showGrid.checked = state.showGrid;
    els.gridSize.value = state.gridSize;
    els.reaction.value = state.reaction;
    els.drawFill.checked = state.drawFill;
    els.lineFillColor.value = state.lineFillColor;
    els.fillWeight.value = state.fillWeight;
    els.drawStroke.checked = state.drawStroke;
    els.lineColor.value = state.lineColor;
    els.strokeWeight.value = state.strokeWeight;
    els.lineCap.value = state.lineCap;
    els.lineJoin.value = state.lineJoin;
    els.randomLineCount.value = state.randomLineCount;
    els.randomLineLength.value = state.randomLineLength;
    els.imageLinesHorizontal.checked = state.imageLinesHorizontal;
    els.imageLinesVertical.checked = state.imageLinesVertical;
    els.imageLinesDiagonal.checked = state.imageLinesDiagonal;
    els.imageThreshold.value = state.imageThreshold;
    els.imageDetail.value = state.imageDetail;
    els.imageScale.value = state.imageScale;
    els.imageOffsetX.value = state.imageOffsetX;
    els.imageOffsetY.value = state.imageOffsetY;
    els.imageBrightness.value = state.imageBrightness;
    els.imageContrast.value = state.imageContrast;
    els.imageInvert.checked = state.imageInvert;
    els.showImage.checked = state.showImage;
    setInputValue(els.widthCm, state.widthCm);
    setInputValue(els.heightCm, state.heightCm);
    setInputValue(els.dpi, state.dpi);
    els.canvasPreset.value = getMatchingCanvasPreset();
    els.paperColor.value = state.paperColor;
    els.transparentPaper.checked = state.transparentPaper;
    els.transparentDrawing.checked = state.transparentDrawing;
    syncIsolationSelect();
    syncOutputs();
  }

  function syncIsolationSelect() {
    while (els.isolationSelect.firstChild) {
      els.isolationSelect.removeChild(els.isolationSelect.firstChild);
    }

    state.isolations.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.enabled === false ? `Object ${index + 1} Off` : `Object ${index + 1}`;
      els.isolationSelect.appendChild(option);
    });

    els.isolationSelect.value = state.selectedIsolationId;
    els.removeIsolation.disabled = state.isolations.length <= 1;
    els.addIsolation.disabled = state.isolations.length >= MAX_ISOLATIONS;
  }

  function syncOutputs() {
    els.gridSizeValue.textContent = state.gridSize;
    els.reactionValue.textContent = state.reaction;
    els.fillWeightValue.textContent = Math.round(state.fillWeight);
    els.strokeWeightValue.textContent = Number(state.strokeWeight).toFixed(1);
    els.randomLineCountValue.textContent = Math.round(state.randomLineCount);
    els.randomLineLengthValue.textContent = Math.round(state.randomLineLength);
    els.imageThresholdValue.textContent = Math.round(state.imageThreshold);
    els.imageDetailValue.textContent = Math.round(state.imageDetail);
    els.imageScaleValue.textContent = Math.round(state.imageScale);
    els.imageOffsetXValue.textContent = Math.round(state.imageOffsetX);
    els.imageOffsetYValue.textContent = Math.round(state.imageOffsetY);
    els.imageBrightnessValue.textContent = Math.round(state.imageBrightness);
    els.imageContrastValue.textContent = Math.round(state.imageContrast);
    updateImageStatus();
    syncSelectedIsolationControls();
  }

  function syncSelectedIsolationControls() {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }

    els.isolationShape.value = item.shape;
    els.isolationEnabled.checked = item.enabled;
    els.isolationOutline.checked = item.outline;
    els.isolationFill.checked = item.fill;
    els.isolationFillColor.value = item.fillColor;
    els.isolationLockAspect.checked = item.lockAspect;
    setInputValue(els.isolationRatioNumber, Number(item.aspectRatio).toFixed(2));
    setInputValue(els.isolationX, Number((item.x * 100).toFixed(1)));
    setInputValue(els.isolationY, Number((item.y * 100).toFixed(1)));
    els.isolationWidth.value = item.width;
    setInputValue(els.isolationWidthNumber, Number(item.width).toFixed(1));
    els.isolationWidthValue.textContent = formatControlValue(item.width);
    els.isolationHeight.value = item.height;
    setInputValue(els.isolationHeightNumber, Number(item.height).toFixed(1));
    els.isolationHeightValue.textContent = formatControlValue(item.height);
    els.isolationRotation.value = item.rotation;
    els.isolationRotationValue.textContent = Math.round(item.rotation);
    els.isolationForce.value = item.force;
    els.isolationForceValue.textContent = Math.round(item.force);
    els.isolationGap.value = item.gap;
    els.isolationGapValue.textContent = formatControlValue(item.gap);
    els.isolationStrokeColor.value = item.strokeColor;
    els.isolationStrokeWidth.value = item.strokeWidth;
    els.isolationStrokeWidthValue.textContent = Number(item.strokeWidth).toFixed(1);
    updateIsolationDrawUi();
  }

  function updateIsolationDrawUi() {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }

    const customPointCount = item.customPath ? item.customPath.length : 0;
    els.drawIsolationShape.classList.toggle("is-active", isolationDrawMode);
    els.drawIsolationShape.textContent = isolationDrawMode ? "Drawing" : "Draw Shape";
    els.clearIsolationShape.disabled = customPointCount < 3;

    if (isolationDrawMode) {
      els.isolationDrawStatus.textContent = customIsolationDraft.active
        ? `${customIsolationDraft.points.length} pts`
        : "Shape capture";
    } else if (customPointCount >= 3 && item.shape === "custom") {
      els.isolationDrawStatus.textContent = `Custom mask ${customPointCount} pts`;
    } else if (customPointCount >= 3) {
      els.isolationDrawStatus.textContent = `Stored custom mask ${customPointCount} pts`;
    } else {
      els.isolationDrawStatus.textContent = "Object ready";
    }
  }

  // Leaves a number field alone while someone is typing in it.
  function setInputValue(input, value) {
    if (input === document.activeElement && input.type === "number") {
      return;
    }
    input.value = value;
  }

  function formatControlValue(value) {
    return Number(value).toFixed(1).replace(".0", "");
  }

  function getSelectedIsolation() {
    return state.isolations.find((item) => item.id === state.selectedIsolationId) || state.isolations[0];
  }

  function updateSelectedIsolation(key, value, mergeKey) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }
    item[key] = value;
    commitChange({ merge: mergeKey });
  }

  function updateIsolationDimension(key, value, mergeKey) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }
    const nextValue = clampNumber(value, ISO_SIZE_MIN, ISO_SIZE_MAX, item[key]);

    if (key === "width") {
      item.width = nextValue;
      if (item.shape === "circle") {
        item.height = nextValue;
        item.aspectRatio = 1;
      } else if (item.lockAspect) {
        item.height = clamp(item.width / item.aspectRatio, ISO_SIZE_MIN, ISO_SIZE_MAX);
      }
    } else {
      item.height = nextValue;
      if (item.shape === "circle") {
        item.width = nextValue;
        item.aspectRatio = 1;
      } else if (item.lockAspect) {
        item.width = clamp(item.height * item.aspectRatio, ISO_SIZE_MIN, ISO_SIZE_MAX);
      }
    }

    if (!item.lockAspect && item.height > 0) {
      item.aspectRatio = item.width / item.height;
    }

    commitChange({ merge: mergeKey });
  }

  function setIsolationAspectLock(locked) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }
    item.lockAspect = locked;
    if (locked) {
      item.aspectRatio = item.height > 0 ? item.width / item.height : 1;
    }
    commitChange();
  }

  function setIsolationAspectRatio(value) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }
    item.aspectRatio = item.shape === "circle" ? 1 : clampNumber(value, 0.05, 20, item.aspectRatio || 1);
    item.lockAspect = true;
    item.height = item.shape === "circle" ? item.width : clamp(item.width / item.aspectRatio, ISO_SIZE_MIN, ISO_SIZE_MAX);
    commitChange({ merge: "isolationRatioNumber" });
  }

  function setRangeState(key, input, parser) {
    state[key] = parser ? parser(input.value) : Number(input.value);
    commitChange({ merge: input.id });
  }

  function setImageState(key, input, parser) {
    state[key] = parser ? parser(input.value) : Number(input.value);
    commitChange({ merge: input.id, image: true });
  }

  function resetAll() {
    const defaults = cloneDefaultState();
    Object.keys(state).forEach((key) => {
      delete state[key];
    });
    Object.assign(state, defaults);
    importedImage.image = null;
    importedImage.name = "";
    importedImage.paths = [];
    importedImage.dirty = false;
    importedImage.key = "";
    els.imageImport.value = "";
    setIsolationDrawMode(false);
    syncControls();
    applyCanvasSize();
    commitChange();
  }

  function randomizeAll() {
    const random = seededRandom((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    const parts = getRandomizeParts();
    if (!Object.values(parts).some(Boolean)) {
      return;
    }

    const keepColors = els.randomizeKeepColors.checked;
    const previousIsolations = state.isolations.map((item) => ({
      fillColor: item.fillColor,
      strokeColor: item.strokeColor,
    }));
    const shapes = ["block", "circle", "diamond", "triangle", "hexagon", "hourglass", "wedge", "cross", "star", "blob"];
    const caps = ["butt", "square", "round"];
    const joins = ["miter", "bevel", "round"];
    const isolationCount = 1 + Math.floor(random() * 3);
    const drawMode = Math.floor(random() * 3);

    if (parts.grid) {
      state.showGrid = random() > 0.18;
      state.gridSize = oddClamp(GRID_SIZE_MIN + random() * (GRID_SIZE_MAX - GRID_SIZE_MIN), GRID_SIZE_MIN, GRID_SIZE_MAX, state.gridSize);
    }

    if (parts.draw) {
      state.reaction = Math.round(random() * 100);
      state.drawStroke = drawMode !== 2;
      state.fillWeight = Math.round(1 + random() * 79);
      state.strokeWeight = Number((0.2 + random() * 23.8).toFixed(1));
      if (!keepColors) {
        state.lineFillColor = randomHexColor(random);
        state.lineColor = randomHexColor(random);
      }
      state.lineCap = caps[Math.floor(random() * caps.length)];
      state.lineJoin = joins[Math.floor(random() * joins.length)];
      state.randomLineCount = Math.round(4 + random() * 76);
      state.randomLineLength = Math.round(2 + random() * 38);
    }

    if (parts.image) {
      state.imageThreshold = Math.round(random() * 255);
      state.imageDetail = Math.round(2 + random() * 6);
      state.imageScale = Math.round(10 + random() * 240);
      state.imageOffsetX = Math.round(-50 + random() * 100);
      state.imageOffsetY = Math.round(-50 + random() * 100);
      state.imageBrightness = Math.round(-100 + random() * 200);
      state.imageContrast = Math.round(-100 + random() * 200);
      state.imageInvert = random() > 0.5;
      state.imageLinesHorizontal = random() > 0.5;
      state.imageLinesVertical = random() > 0.5;
      state.imageLinesDiagonal = random() > 0.5;
      if (!state.imageLinesHorizontal && !state.imageLinesVertical && !state.imageLinesDiagonal) {
        state.imageLinesHorizontal = true;
      }
      state.showImage = Boolean(importedImage.image && random() > 0.45);
      importedImage.dirty = true;
    }

    if (parts.canvas) {
      state.widthCm = Number((8 + random() * 52).toFixed(1));
      state.heightCm = Number((8 + random() * 52).toFixed(1));
      state.dpi = Math.round(120 + random() * 360);
    }

    if (parts.surface) {
      if (!keepColors) {
        state.paperColor = randomHexColor(random);
      }
      state.transparentPaper = random() > 0.82;
      state.transparentDrawing = random() > 0.82;
    }

    if (parts.isolation) {
      state.isolations = Array.from({ length: isolationCount }, (_, index) => {
        const width = 8 + random() * 24;
        const height = 6 + random() * 25;
        const shape = shapes[Math.floor(random() * shapes.length)];
        return normalizeIsolation(
          {
            id: `iso-${index + 1}`,
            enabled: random() > 0.12,
            outline: random() > 0.12,
            fill: random() > 0.55,
            fillColor: keepColors ? previousIsolations[index]?.fillColor || state.isolations[0]?.fillColor || "#00ff00" : randomHexColor(random),
            shape,
            x: 0.14 + random() * 0.72,
            y: 0.14 + random() * 0.72,
            width,
            height: shape === "circle" ? width : height,
            rotation: Math.round(-180 + random() * 360),
            force: Math.round(random() * 250),
            gap: Number((random() * 35).toFixed(1)),
            strokeColor: keepColors ? previousIsolations[index]?.strokeColor || state.isolations[0]?.strokeColor || "#00ff00" : randomHexColor(random),
            strokeWidth: Number((0.2 + random() * 23.8).toFixed(1)),
          },
          index
        );
      });
      state.selectedIsolationId = state.isolations[0].id;
    }

    setIsolationDrawMode(false);
    syncControls();
    if (parts.canvas) {
      applyCanvasSize();
    }
    commitChange();
  }

  function getRandomizeParts() {
    return {
      grid: els.randomizeGridSettings.checked,
      draw: els.randomizeDrawSettings.checked,
      image: els.randomizeImageSettings.checked,
      isolation: els.randomizeIsolationSettings.checked,
      canvas: els.randomizeCanvasSettings.checked,
      surface: els.randomizeSurfaceSettings.checked,
    };
  }

  function randomizeSelectedIsolation() {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }

    const random = seededRandom((Date.now() ^ hashSeed(item.id) ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    const shapes = ["block", "circle", "diamond", "triangle", "hexagon", "hourglass", "wedge", "cross", "star", "blob"];
    const shape = shapes[Math.floor(random() * shapes.length)];
    const width = 7 + random() * 28;
    const height = shape === "circle" ? width : 5 + random() * 28;

    item.shape = shape;
    item.customPath = item.customPath || [];
    item.x = 0.1 + random() * 0.8;
    item.y = 0.1 + random() * 0.8;
    item.width = width;
    item.height = height;
    item.rotation = Math.round(-90 + random() * 180);
    item.force = Math.round(60 + random() * 170);
    item.gap = Number((2 + random() * 24).toFixed(1));
    item.strokeWidth = Number((0.7 + random() * 4.4).toFixed(1));
    item.fill = random() > 0.78;
    item.aspectRatio = item.height > 0 ? item.width / item.height : 1;

    setIsolationDrawMode(false);
    commitChange();
  }

  function randomizeDrawing() {
    const random = seededRandom((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    state.paths = buildRandomLinePaths(random);
    commitChange();
  }

  function buildRandomLinePaths(random) {
    const grid = getGrid(canvas.width, canvas.height, Math.min(canvas.width, canvas.height) * 0.055);
    const paths = [];
    const count = Math.round(state.randomLineCount);

    for (let index = 0; index < count; index += 1) {
      const start = {
        gx: Math.floor(random() * grid.columns),
        gy: Math.floor(random() * grid.rows),
      };
      const cells = [[start.gx, start.gy]];
      let gx = start.gx;
      let gy = start.gy;
      let direction = randomCardinalDirection(random);
      const length = 2 + Math.floor(random() * Math.max(2, state.randomLineLength));

      for (let step = 0; step < length; step += 1) {
        if (random() < 0.38) {
          direction = randomTurn(direction, random);
        }
        gx += direction[0];
        gy += direction[1];
        cells.push([gx, gy]);
      }

      pushGridPath(paths, cells, grid);
    }

    return paths.slice(-MAX_PATHS);
  }

  function scheduleRender() {
    if (raf) {
      return;
    }
    raf = requestAnimationFrame(() => {
      raf = 0;
      render(ctx, canvas.width, canvas.height);
    });
  }

  function render(target, width, height) {
    const minSide = Math.min(width, height);
    const maxSide = Math.max(width, height);
    const grid = getGrid(width, height, minSide * 0.055);
    const geos = getIsolationGeometries(grid);

    target.save();
    target.clearRect(0, 0, width, height);
    if (!state.transparentPaper) {
      target.fillStyle = state.paperColor;
      target.fillRect(0, 0, width, height);
    }

    drawUnderlyingImage(target, grid);
    if (state.showGrid) {
      drawGrid(target, grid, geos, width, height);
    }
    rebuildImportedImageIfNeeded(grid);
    drawStoredLines(target, getDrawingPaths(), grid, geos, maxSide);
    drawIsolationObjects(target, geos, maxSide);
    drawCustomIsolationDraft(target, grid, maxSide);
    target.restore();
  }

  function getDrawingPaths() {
    return importedImage.paths.length ? state.paths.concat(importedImage.paths) : state.paths;
  }

  function drawUnderlyingImage(target, grid) {
    if (!state.showImage || !importedImage.image) {
      return;
    }

    const placement = getImagePlacement(importedImage.image, grid);
    target.save();
    target.globalAlpha = state.transparentDrawing ? 0.28 : 0.55;
    target.drawImage(
      importedImage.image,
      grid.x + grid.width * placement.x,
      grid.y + grid.height * placement.y,
      grid.width * placement.width,
      grid.height * placement.height
    );
    target.restore();
  }

  // Grid area inside the canvas margin, without columns and rows.
  function getGridBox(width, height) {
    const margin = Math.min(width, height) * 0.055;
    return {
      width: width - margin * 2,
      height: height - margin * 2,
    };
  }

  function getGrid(width, height, margin) {
    const columns = state.gridSize;
    const rows = Math.max(3, Math.round((height / width) * columns));
    return {
      x: margin,
      y: margin,
      width: width - margin * 2,
      height: height - margin * 2,
      columns,
      rows,
      stepX: (width - margin * 2) / (columns - 1),
      stepY: (height - margin * 2) / (rows - 1),
    };
  }

  function getIsolationGeometries(grid) {
    const minSide = Math.min(grid.width, grid.height);
    const step = Math.max(grid.stepX, grid.stepY);
    return state.isolations.filter((item) => item.enabled !== false).map((item) => {
      const width = minSide * (item.width / 100);
      const height = minSide * (item.height / 100);
      const gap = minSide * (item.gap / 100) + step * 0.45;

      const geo = {
        id: item.id,
        source: item,
        outline: item.outline !== false,
        fill: item.fill === true,
        fillColor: item.fillColor,
        shape: item.shape,
        customPath: item.customPath || [],
        x: grid.x + grid.width * item.x,
        y: grid.y + grid.height * item.y,
        width,
        height,
        rotation: (item.rotation / 180) * Math.PI,
        force: item.force / 100,
        gap,
        strokeColor: item.strokeColor,
        strokeWidth: item.strokeWidth,
      };
      geo.localLoops = makeIsolationLocalLoops(geo, 96);
      geo.boundaryLoops = makeIsolationBoundaryLoops(geo, 96);
      geo.boundRadius = getIsolationBoundRadius(geo);
      return geo;
    });
  }

  // Radius of a circle around the centre that contains the whole shape, used to skip far-away points.
  function getIsolationBoundRadius(geo) {
    let radius = Math.hypot(Math.max(1, geo.width / 2), Math.max(1, geo.height / 2));
    geo.localLoops.forEach((loop) => {
      loop.forEach((point) => {
        radius = Math.max(radius, Math.hypot(point[0], point[1]));
      });
    });
    return radius;
  }

  function drawGrid(target, grid, geos, width, height) {
    const alpha = state.transparentDrawing ? 0.1 : 0.18;
    target.save();
    target.strokeStyle = withAlpha(state.lineColor, alpha);
    target.lineWidth = Math.max(0.3, Math.min(width, height) / 4200);
    target.beginPath();

    for (let xIndex = 0; xIndex < grid.columns; xIndex += 1) {
      const x = grid.x + xIndex * grid.stepX;
      moveSegmentedLine(target, x, grid.y, x, grid.y + grid.height, geos);
    }

    for (let yIndex = 0; yIndex < grid.rows; yIndex += 1) {
      const y = grid.y + yIndex * grid.stepY;
      moveSegmentedLine(target, grid.x, y, grid.x + grid.width, y, geos);
    }

    target.stroke();
    target.restore();
  }

  function moveSegmentedLine(target, x1, y1, x2, y2, geos) {
    const segments = 120;
    const minStep = Math.min(target.canvas.width, target.canvas.height) / 900;
    let drawing = false;
    let last = null;

    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const source = {
        x: x1 + (x2 - x1) * t,
        y: y1 + (y2 - y1) * t,
      };

      if (isInsideAnyIsolation(source.x, source.y, geos, false)) {
        drawing = false;
        last = null;
        continue;
      }

      const reacted = reactPoint(source.x, source.y, geos, minStep);
      if (isInsideAnyIsolation(reacted.x, reacted.y, geos, false)) {
        drawing = false;
        last = null;
        continue;
      }

      const jump = last ? Math.hypot(reacted.x - last.x, reacted.y - last.y) : 0;
      if (!drawing || jump > minStep * 7) {
        target.moveTo(reacted.x, reacted.y);
        drawing = true;
      } else {
        target.lineTo(reacted.x, reacted.y);
      }
      last = reacted;
    }
  }

  function drawStoredLines(target, paths, grid, geos, maxSide) {
    const alpha = state.transparentDrawing ? 0.42 : 1;
    const scale = maxSide / 2953;
    const fillWidth = Math.max(1, state.fillWeight * scale);
    const outlineWidth = Math.max(0.2, state.strokeWeight * scale);
    const layerCanvas = document.createElement("canvas");
    layerCanvas.width = target.canvas.width;
    layerCanvas.height = target.canvas.height;
    const layer = layerCanvas.getContext("2d", { alpha: true });

    layer.save();
    layer.lineCap = state.lineCap;
    layer.lineJoin = state.lineJoin;
    layer.miterLimit = 2;

    paths.forEach((path) => {
      const line = buildReactiveLine(path.points, grid, geos);
      if (state.drawStroke && state.drawFill) {
        strokeLinePath(layer, line, withAlpha(state.lineColor, alpha), fillWidth + outlineWidth * 2);
        strokeLinePath(layer, line, withAlpha(state.lineFillColor, alpha), fillWidth);
      } else if (state.drawFill) {
        strokeLinePath(layer, line, withAlpha(state.lineFillColor, alpha), fillWidth);
      } else if (state.drawStroke) {
        strokeLinePath(layer, line, withAlpha(state.lineColor, alpha), outlineWidth);
      }
    });

    layer.restore();
    target.drawImage(layerCanvas, 0, 0);
  }

  // Reacted line as a flat list of commands: [isMove (1/0), x, y, ...]. Computed once, stroked once per style.
  function buildReactiveLine(points, grid, geos) {
    const commands = [];
    if (!points.length) {
      return commands;
    }

    const minStep = Math.min(grid.stepX, grid.stepY) * 0.38;
    let drawing = false;
    let last = null;

    if (points.length === 1) {
      const single = gridRatioToCanvas(points[0], grid);
      const reacted = reactPoint(single.x, single.y, geos, minStep);
      commands.push(1, reacted.x - 0.01, reacted.y, 0, reacted.x + 0.01, reacted.y);
      return commands;
    }

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = gridRatioToCanvas(points[index], grid);
      const end = gridRatioToCanvas(points[index + 1], grid);
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const gridStep = Math.max(grid.stepX, grid.stepY);
      const samples = length <= gridStep * 1.08 ? 1 : Math.max(1, Math.ceil(length / minStep));

      for (let sample = 0; sample <= samples; sample += 1) {
        if (index > 0 && sample === 0) {
          continue;
        }

        const t = sample / samples;
        const source = {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        };

        if (isInsideAnyIsolation(source.x, source.y, geos, false)) {
          drawing = false;
          last = null;
          continue;
        }

        const reacted = reactPoint(source.x, source.y, geos, minStep);
        if (isInsideAnyIsolation(reacted.x, reacted.y, geos, false)) {
          drawing = false;
          last = null;
          continue;
        }

        const jump = last ? Math.hypot(reacted.x - last.x, reacted.y - last.y) : 0;
        if (!drawing || jump > minStep * 5.5) {
          commands.push(1, reacted.x, reacted.y);
          drawing = true;
        } else {
          commands.push(0, reacted.x, reacted.y);
        }
        last = reacted;
      }
    }

    return commands;
  }

  function strokeLinePath(target, commands, color, weight) {
    if (!commands.length) {
      return;
    }

    target.strokeStyle = color;
    target.lineWidth = weight;
    target.beginPath();
    for (let index = 0; index < commands.length; index += 3) {
      if (commands[index]) {
        target.moveTo(commands[index + 1], commands[index + 2]);
      } else {
        target.lineTo(commands[index + 1], commands[index + 2]);
      }
    }
    target.stroke();
  }

  function ratioToCanvas(point, grid) {
    return {
      x: grid.x + grid.width * point.x,
      y: grid.y + grid.height * point.y,
    };
  }

  function gridRatioToCanvas(point, grid) {
    return ratioToCanvas(snapPointToGrid(point, grid), grid);
  }

  function snapPointToGrid(point, grid) {
    return {
      x: Math.round(clamp(point.x, 0, 1) * (grid.columns - 1)) / (grid.columns - 1),
      y: Math.round(clamp(point.y, 0, 1) * (grid.rows - 1)) / (grid.rows - 1),
    };
  }

  function reactPoint(x, y, geos, step) {
    const reaction = state.reaction / 100;
    let output = { x, y };

    geos.forEach((geo, index) => {
      const shapeRadius = Math.max(geo.width, geo.height) / 2;
      const reach = geo.gap + (geo.gap * 2.3 + shapeRadius * 0.55) * reaction * geo.force;
      const minDistance = Math.hypot(output.x - geo.x, output.y - geo.y) - geo.boundRadius;
      if (minDistance > geo.gap && minDistance >= reach) {
        return;
      }

      const field = getIsolationField(output.x, output.y, geo);
      const distance = Math.max(field.signedDistance, 0);

      if (field.signedDistance <= geo.gap) {
        output = projectOutsideIsolation(output.x, output.y, geo, geo.gap + step * 0.9);
        return;
      }

      if (distance >= reach) {
        return;
      }

      const falloff = Math.pow(1 - distance / reach, 2);
      const normal = field.normal;
      const spin = index % 2 === 0 ? 1 : -1;
      const tangent = { x: -normal.y * spin, y: normal.x * spin };
      const push = falloff * geo.force * reaction;
      const radial = push * geo.gap * 1.4;
      const lateral = push * geo.gap * 1.9;

      output = {
        x: output.x + normal.x * radial + tangent.x * lateral,
        y: output.y + normal.y * radial + tangent.y * lateral,
      };
    });

    return output;
  }

  function getIsolationField(x, y, geo) {
    const local = toLocalPoint(x, y, geo);
    const inside = isInsideLocalShape(local.x, local.y, geo);
    const closest = closestPointOnIsolationBoundary(x, y, geo);
    const dx = x - closest.x;
    const dy = y - closest.y;
    const distance = Math.hypot(dx, dy);
    let normal;

    if (distance > 0.0001) {
      const direction = inside ? -1 : 1;
      normal = {
        x: (dx / distance) * direction,
        y: (dy / distance) * direction,
      };
    } else {
      normal = fallbackIsolationNormal(x, y, geo);
    }

    return {
      closest,
      distance,
      signedDistance: inside ? -distance : distance,
      normal,
    };
  }

  function closestPointOnIsolationBoundary(x, y, geo) {
    const loops = geo.boundaryLoops && geo.boundaryLoops.length ? geo.boundaryLoops : makeIsolationBoundaryLoops(geo, 96);
    let bestX = geo.x;
    let bestY = geo.y;
    let bestDistance = Infinity;

    // Closest point on each segment, inlined without allocations because this runs for every line sample.
    for (let loopIndex = 0; loopIndex < loops.length; loopIndex += 1) {
      const loop = loops[loopIndex];
      if (!loop || loop.length < 2) {
        continue;
      }

      for (let index = 0; index < loop.length; index += 1) {
        const start = loop[index];
        const end = loop[(index + 1) % loop.length];
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = dx * dx + dy * dy;
        const t = length > 0 ? clamp(((x - start.x) * dx + (y - start.y) * dy) / length, 0, 1) : 0;
        const px = start.x + dx * t;
        const py = start.y + dy * t;
        const distance = (x - px) * (x - px) + (y - py) * (y - py);
        if (distance < bestDistance) {
          bestX = px;
          bestY = py;
          bestDistance = distance;
        }
      }
    }

    return { x: bestX, y: bestY };
  }

  function fallbackIsolationNormal(x, y, geo) {
    const local = toLocalPoint(x, y, geo);
    const length = Math.hypot(local.x, local.y);
    const unit = length > 0.0001 ? { x: local.x / length, y: local.y / length } : { x: 1, y: 0 };
    return rotateLocalVector(unit.x, unit.y, geo);
  }

  function rotateLocalVector(x, y, geo) {
    const cos = Math.cos(geo.rotation);
    const sin = Math.sin(geo.rotation);
    return {
      x: x * cos - y * sin,
      y: x * sin + y * cos,
    };
  }

  function drawIsolationObjects(target, geos, maxSide) {
    const scale = maxSide / 2953;
    target.save();
    target.globalCompositeOperation = "source-over";

    geos.forEach((geo) => {
      if (geo.fill) {
        target.fillStyle = geo.fillColor;
        target.beginPath();
        addIsolationPath(target, geo, 0);
        target.fill("evenodd");
      }

      if (geo.outline) {
        target.strokeStyle = withAlpha(geo.strokeColor, state.transparentDrawing ? 0.5 : 1);
        target.lineWidth = Math.max(0.45, geo.strokeWidth * scale);
        target.beginPath();
        addIsolationPath(target, geo, 0);
        target.stroke();
      }
    });

    target.restore();
  }

  function addIsolationPath(target, geo, extra) {
    target.save();
    target.translate(geo.x, geo.y);
    target.rotate(geo.rotation);

    if (geo.shape === "circle") {
      target.ellipse(0, 0, geo.width / 2 + extra, geo.height / 2 + extra, 0, 0, Math.PI * 2);
    } else if (geo.shape === "diamond") {
      addPolygonPath(target, [
        [0, -(geo.height / 2 + extra)],
        [geo.width / 2 + extra, 0],
        [0, geo.height / 2 + extra],
        [-(geo.width / 2 + extra), 0],
      ]);
    } else if (geo.shape === "triangle") {
      addPolygonPath(target, [
        [0, -(geo.height / 2 + extra)],
        [geo.width / 2 + extra, geo.height / 2 + extra],
        [-(geo.width / 2 + extra), geo.height / 2 + extra],
      ]);
    } else if (geo.shape === "hexagon") {
      addRegularPolygonPath(target, geo.width / 2 + extra, geo.height / 2 + extra, 6);
    } else if (geo.shape === "hourglass") {
      addHourglassPath(target, geo.width / 2 + extra, geo.height / 2 + extra);
    } else if (geo.shape === "wedge") {
      addWedgePath(target, geo.width / 2 + extra, geo.height / 2 + extra);
    } else if (geo.shape === "cross") {
      addCrossPath(target, geo.width + extra * 2, geo.height + extra * 2);
    } else if (geo.shape === "star") {
      addStarPath(target, geo.width / 2 + extra, geo.height / 2 + extra, 5);
    } else if (geo.shape === "blob") {
      addBlobPath(target, geo.width / 2 + extra, geo.height / 2 + extra);
    } else if (geo.shape === "custom" && geo.customPath && geo.customPath.length >= 3) {
      addCustomIsolationPath(target, geo, extra);
    } else {
      const width = geo.width + extra * 2;
      const height = geo.height + extra * 2;
      target.rect(-width / 2, -height / 2, width, height);
    }

    target.restore();
  }

  function addCustomIsolationPath(target, geo, extra) {
    const width = geo.width + extra * 2;
    const height = geo.height + extra * 2;
    geo.customPath.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) {
        target.moveTo(x, y);
      } else {
        target.lineTo(x, y);
      }
    });
    target.closePath();
  }

  function addPolygonPath(target, points) {
    points.forEach((point, index) => {
      if (index === 0) {
        target.moveTo(point[0], point[1]);
      } else {
        target.lineTo(point[0], point[1]);
      }
    });
    target.closePath();
  }

  function addRegularPolygonPath(target, radiusX, radiusY, sides) {
    const points = [];
    for (let i = 0; i < sides; i += 1) {
      const angle = -Math.PI / 2 + (i / sides) * Math.PI * 2;
      points.push([Math.cos(angle) * radiusX, Math.sin(angle) * radiusY]);
    }
    addPolygonPath(target, points);
  }

  function addHourglassPath(target, radiusX, radiusY) {
    addPolygonPath(target, [
      [-radiusX, -radiusY],
      [radiusX, -radiusY],
      [0, 0],
    ]);
    addPolygonPath(target, [
      [-radiusX, radiusY],
      [radiusX, radiusY],
      [0, 0],
    ]);
  }

  function addWedgePath(target, radiusX, radiusY) {
    target.moveTo(0, 0);
    target.ellipse(0, 0, radiusX, radiusY, 0, -Math.PI * 0.68, Math.PI * 0.68);
    target.closePath();
  }

  function addCrossPath(target, width, height) {
    const armX = width / 6;
    const armY = height / 6;
    addPolygonPath(target, [
      [-armX, -height / 2],
      [armX, -height / 2],
      [armX, -armY],
      [width / 2, -armY],
      [width / 2, armY],
      [armX, armY],
      [armX, height / 2],
      [-armX, height / 2],
      [-armX, armY],
      [-width / 2, armY],
      [-width / 2, -armY],
      [-armX, -armY],
    ]);
  }

  function addStarPath(target, radiusX, radiusY, points) {
    const count = points * 2;
    for (let i = 0; i < count; i += 1) {
      const radius = i % 2 === 0 ? 1 : 0.43;
      const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radiusX * radius;
      const y = Math.sin(angle) * radiusY * radius;
      if (i === 0) {
        target.moveTo(x, y);
      } else {
        target.lineTo(x, y);
      }
    }
    target.closePath();
  }

  function addBlobPath(target, radiusX, radiusY) {
    const points = 12;
    for (let i = 0; i <= points; i += 1) {
      const angle = (i / points) * Math.PI * 2;
      const wobble = 0.82 + Math.sin(angle * 3.1) * 0.1 + Math.cos(angle * 5.2) * 0.08;
      const x = Math.cos(angle) * radiusX * wobble;
      const y = Math.sin(angle) * radiusY * wobble;
      if (i === 0) {
        target.moveTo(x, y);
      } else {
        target.lineTo(x, y);
      }
    }
    target.closePath();
  }

  function makeIsolationBoundaryLoops(geo, samples) {
    return getIsolationLocalLoops(geo, samples).map((loop) => loop.map((point) => fromLocalPoint(point[0], point[1], geo)));
  }

  function getIsolationLocalLoops(geo, samples) {
    return geo.localLoops && geo.localLoops.length ? geo.localLoops : makeIsolationLocalLoops(geo, samples);
  }

  function makeIsolationLocalLoops(geo, samples) {
    const rx = geo.width / 2;
    const ry = geo.height / 2;

    if (geo.shape === "custom" && geo.customPath && geo.customPath.length >= 3) {
      return [geo.customPath.map((point) => [point.x * geo.width, point.y * geo.height])];
    }

    if (geo.shape === "circle") {
      return [makeEllipseLocalLoop(rx, ry, samples)];
    }

    if (geo.shape === "blob") {
      return [makeBlobLocalLoop(rx, ry, samples)];
    }

    if (geo.shape === "diamond") {
      return [
        [
          [0, -ry],
          [rx, 0],
          [0, ry],
          [-rx, 0],
        ],
      ];
    }

    if (geo.shape === "triangle") {
      return [
        [
          [0, -ry],
          [rx, ry],
          [-rx, ry],
        ],
      ];
    }

    if (geo.shape === "hexagon") {
      return [regularPolygonPoints(rx, ry, 6)];
    }

    if (geo.shape === "hourglass") {
      return [
        [
          [-rx, -ry],
          [rx, -ry],
          [0, 0],
        ],
        [
          [-rx, ry],
          [rx, ry],
          [0, 0],
        ],
      ];
    }

    if (geo.shape === "wedge") {
      return [makeWedgeLocalLoop(rx, ry, samples)];
    }

    if (geo.shape === "cross") {
      return [makeCrossLocalLoop(geo.width, geo.height)];
    }

    if (geo.shape === "star") {
      return [makeStarLocalLoop(rx, ry, 5)];
    }

    return [
      [
        [-rx, -ry],
        [rx, -ry],
        [rx, ry],
        [-rx, ry],
      ],
    ];
  }

  function makeEllipseLocalLoop(radiusX, radiusY, samples) {
    const points = [];
    for (let index = 0; index < samples; index += 1) {
      const angle = (index / samples) * Math.PI * 2;
      points.push([Math.cos(angle) * radiusX, Math.sin(angle) * radiusY]);
    }
    return points;
  }

  function makeBlobLocalLoop(radiusX, radiusY, samples) {
    const points = [];
    for (let index = 0; index < samples; index += 1) {
      const angle = (index / samples) * Math.PI * 2;
      const wobble = 0.82 + Math.sin(angle * 3.1) * 0.1 + Math.cos(angle * 5.2) * 0.08;
      points.push([Math.cos(angle) * radiusX * wobble, Math.sin(angle) * radiusY * wobble]);
    }
    return points;
  }

  function makeWedgeLocalLoop(radiusX, radiusY, samples) {
    const points = [[0, 0]];
    const start = -Math.PI * 0.68;
    const end = Math.PI * 0.68;
    const steps = Math.max(12, Math.round(samples * 0.45));
    for (let index = 0; index <= steps; index += 1) {
      const angle = start + (index / steps) * (end - start);
      points.push([Math.cos(angle) * radiusX, Math.sin(angle) * radiusY]);
    }
    return points;
  }

  function makeCrossLocalLoop(width, height) {
    const armX = width / 6;
    const armY = height / 6;
    return [
      [-armX, -height / 2],
      [armX, -height / 2],
      [armX, -armY],
      [width / 2, -armY],
      [width / 2, armY],
      [armX, armY],
      [armX, height / 2],
      [-armX, height / 2],
      [-armX, armY],
      [-width / 2, armY],
      [-width / 2, -armY],
      [-armX, -armY],
    ];
  }

  function makeStarLocalLoop(radiusX, radiusY, points) {
    const result = [];
    const count = points * 2;
    for (let index = 0; index < count; index += 1) {
      const radius = index % 2 === 0 ? 1 : 0.43;
      const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
      result.push([Math.cos(angle) * radiusX * radius, Math.sin(angle) * radiusY * radius]);
    }
    return result;
  }

  function isInsideAnyIsolation(x, y, geos, withGap) {
    return geos.some((geo) => isInsideIsolation(x, y, geo, withGap));
  }

  function isInsideIsolation(x, y, geo, withGap) {
    if (geo.boundRadius && Math.hypot(x - geo.x, y - geo.y) > geo.boundRadius + (withGap ? geo.gap : 0) + 1) {
      return false;
    }

    const local = toLocalPoint(x, y, geo);
    if (isInsideLocalShape(local.x, local.y, geo)) {
      return true;
    }

    return withGap ? getIsolationField(x, y, geo).distance <= geo.gap : false;
  }

  function isInsideLocalShape(x, y, geo) {
    const rx = Math.max(1, geo.width / 2);
    const ry = Math.max(1, geo.height / 2);

    if (geo.shape === "custom" && geo.customPath && geo.customPath.length >= 3) {
      return pointInPolygon(x, y, getIsolationLocalLoops(geo, 32)[0]);
    }

    if (geo.shape === "circle") {
      return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1;
    }

    if (geo.shape === "blob") {
      return pointInPolygon(x, y, getIsolationLocalLoops(geo, 64)[0]);
    }

    if (geo.shape === "diamond") {
      return Math.abs(x) / rx + Math.abs(y) / ry <= 1;
    }

    if (geo.shape === "triangle") {
      return pointInPolygon(x, y, [
        [0, -ry],
        [rx, ry],
        [-rx, ry],
      ]);
    }

    if (geo.shape === "hexagon") {
      return pointInPolygon(x, y, regularPolygonPoints(rx, ry, 6));
    }

    if (geo.shape === "hourglass") {
      return getIsolationLocalLoops(geo, 6).some((loop) => pointInPolygon(x, y, loop));
    }

    if (geo.shape === "wedge") {
      const metric = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      const angle = Math.atan2(y / ry, x / rx);
      return metric <= 1 && Math.abs(angle) <= Math.PI * 0.68;
    }

    if (geo.shape === "cross") {
      return pointInPolygon(x, y, getIsolationLocalLoops(geo, 12)[0]);
    }

    if (geo.shape === "star") {
      return pointInPolygon(x, y, getIsolationLocalLoops(geo, 10)[0]);
    }

    return Math.abs(x) <= rx && Math.abs(y) <= ry;
  }

  function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const xi = points[i][0];
      const yi = points[i][1];
      const xj = points[j][0];
      const yj = points[j][1];
      const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) {
        inside = !inside;
      }
    }
    return inside;
  }

  function regularPolygonPoints(radiusX, radiusY, sides) {
    const points = [];
    for (let i = 0; i < sides; i += 1) {
      const angle = -Math.PI / 2 + (i / sides) * Math.PI * 2;
      points.push([Math.cos(angle) * radiusX, Math.sin(angle) * radiusY]);
    }
    return points;
  }

  function projectOutsideIsolation(x, y, geo, extra) {
    const field = getIsolationField(x, y, geo);
    return {
      x: field.closest.x + field.normal.x * extra,
      y: field.closest.y + field.normal.y * extra,
    };
  }

  function toLocalPoint(x, y, geo) {
    const dx = x - geo.x;
    const dy = y - geo.y;
    if (geo.localRotation !== geo.rotation) {
      geo.localRotation = geo.rotation;
      geo.localCos = Math.cos(-geo.rotation);
      geo.localSin = Math.sin(-geo.rotation);
    }
    const cos = geo.localCos;
    const sin = geo.localSin;
    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    };
  }

  function fromLocalPoint(x, y, geo) {
    const cos = Math.cos(geo.rotation);
    const sin = Math.sin(geo.rotation);
    return {
      x: geo.x + x * cos - y * sin,
      y: geo.y + x * sin + y * cos,
    };
  }

  function hexToRgb(hex) {
    const value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function withAlpha(hex, alpha) {
    const rgb = hexToRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function pointerToCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function pointToGrid(point) {
    const grid = getGrid(canvas.width, canvas.height, Math.min(canvas.width, canvas.height) * 0.055);
    const gx = clamp(Math.round((point.x - grid.x) / grid.stepX), 0, grid.columns - 1);
    const gy = clamp(Math.round((point.y - grid.y) / grid.stepY), 0, grid.rows - 1);

    return {
      gx,
      gy,
      ratioX: gx / (grid.columns - 1),
      ratioY: gy / (grid.rows - 1),
      grid,
    };
  }

  function pointerToGridRatio(event) {
    const point = pointerToCanvas(event);
    const grid = getGrid(canvas.width, canvas.height, Math.min(canvas.width, canvas.height) * 0.055);
    return {
      x: clamp((point.x - grid.x) / grid.width, 0, 1),
      y: clamp((point.y - grid.y) / grid.height, 0, 1),
      point,
      grid,
    };
  }

  function clampCell(value, max) {
    return Math.round(clamp(value, 0, max));
  }

  function makeGridPoint(gx, gy, grid) {
    return {
      x: clampCell(gx, grid.columns - 1) / (grid.columns - 1),
      y: clampCell(gy, grid.rows - 1) / (grid.rows - 1),
    };
  }

  function makeGridPath(cells, grid) {
    const points = [];
    cells.forEach((cell) => {
      const gx = Array.isArray(cell) ? cell[0] : cell.gx;
      const gy = Array.isArray(cell) ? cell[1] : cell.gy;
      const point = makeGridPoint(gx, gy, grid);
      const last = points[points.length - 1];
      if (!last || last.x !== point.x || last.y !== point.y) {
        points.push(point);
      }
    });
    return points.length > 1 ? { points } : null;
  }

  function pushGridPath(paths, cells, grid) {
    const path = makeGridPath(cells, grid);
    if (path) {
      paths.push(path);
    }
  }

  function randomCardinalDirection(random) {
    return [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ][Math.floor(random() * 4)];
  }

  function randomTurn(direction, random) {
    if (direction[0] !== 0) {
      return [0, random() < 0.5 ? -1 : 1];
    }
    return [random() < 0.5 ? -1 : 1, 0];
  }

  function hashSeed(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let value = seed || 1;
    return () => {
      value = Math.imul(1664525, value) + 1013904223;
      return ((value >>> 0) / 4294967296);
    };
  }

  function startLine(event) {
    const path = { points: [] };
    state.paths.push(path);
    if (state.paths.length > MAX_PATHS) {
      state.paths.shift();
    }
    pointer.activePath = path;
    addLinePoint(event);
  }

  function addLinePoint(event) {
    if (!pointer.activePath) {
      return;
    }

    const mapped = pointToGrid(pointerToCanvas(event));
    const key = `${mapped.gx}:${mapped.gy}`;
    if (key === pointer.lastCell) {
      return;
    }

    const point = {
      x: mapped.ratioX,
      y: mapped.ratioY,
    };
    const points = pointer.activePath.points;
    const last = points[points.length - 1];

    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.0001) {
      return;
    }

    pointer.lastCell = key;
    points.push(point);
    if (points.length > MAX_POINTS_PER_PATH) {
      points.shift();
    }
    scheduleRender();
  }

  function moveIsolationFromPointer(event) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }

    const mapped = pointerToGridRatio(event);
    item.x = clamp(mapped.x + pointer.offsetX, 0, 1);
    item.y = clamp(mapped.y + pointer.offsetY, 0, 1);
    syncSelectedIsolationControls();
    scheduleRender();
  }

  function setIsolationDrawMode(enabled) {
    isolationDrawMode = enabled;
    customIsolationDraft.active = false;
    customIsolationDraft.points = [];
    updateIsolationDrawUi();
    scheduleRender();
  }

  function startCustomIsolationShape(event) {
    customIsolationDraft.active = true;
    customIsolationDraft.points = [];
    addCustomIsolationPoint(event);
  }

  function addCustomIsolationPoint(event) {
    if (!customIsolationDraft.active) {
      return;
    }

    const mapped = pointerToGridRatio(event);
    const point = {
      x: mapped.x,
      y: mapped.y,
    };
    const points = customIsolationDraft.points;
    const last = points[points.length - 1];

    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.0025) {
      return;
    }

    points.push(point);
    if (points.length > MAX_CUSTOM_ISOLATION_POINTS) {
      points.shift();
    }
    updateIsolationDrawUi();
    scheduleRender();
  }

  function finishCustomIsolationShape() {
    const points = customIsolationDraft.points.slice();
    customIsolationDraft.active = false;
    customIsolationDraft.points = [];

    if (points.length >= 3) {
      applyCustomIsolationShape(points);
      isolationDrawMode = false;
      commitChange();
      return;
    }

    updateIsolationDrawUi();
    scheduleRender();
  }

  function applyCustomIsolationShape(points) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }

    const bounds = getPointBounds(points);
    const rawWidth = Math.max(0.0001, bounds.maxX - bounds.minX);
    const rawHeight = Math.max(0.0001, bounds.maxY - bounds.minY);
    const grid = getGrid(canvas.width, canvas.height, Math.min(canvas.width, canvas.height) * 0.055);
    const shortSide = Math.min(grid.width, grid.height);
    const width = clamp((Math.max(rawWidth, 0.03) * grid.width * 100) / shortSide, ISO_SIZE_MIN, ISO_SIZE_MAX);
    const height = clamp((Math.max(rawHeight, 0.03) * grid.height * 100) / shortSide, ISO_SIZE_MIN, ISO_SIZE_MAX);
    const pathWidth = Math.max(rawWidth, 0.03);
    const pathHeight = Math.max(rawHeight, 0.03);
    const centerX = clamp((bounds.minX + bounds.maxX) / 2, 0, 1);
    const centerY = clamp((bounds.minY + bounds.maxY) / 2, 0, 1);

    item.shape = "custom";
    item.x = centerX;
    item.y = centerY;
    item.width = width;
    item.height = height;
    item.rotation = 0;
    item.lockAspect = false;
    item.aspectRatio = width / height;
    item.outline = true;
    item.enabled = true;
    item.customPath = normalizeCustomIsolationPath(
      points.map((point) => ({
        x: (point.x - centerX) / pathWidth,
        y: (point.y - centerY) / pathHeight,
      }))
    );
  }

  function clearCustomIsolationShape() {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }

    item.customPath = [];
    if (item.shape === "custom") {
      item.shape = "block";
    }
    setIsolationDrawMode(false);
    commitChange();
  }

  function getPointBounds(points) {
    return points.reduce(
      (bounds, point) => ({
        minX: Math.min(bounds.minX, point.x),
        minY: Math.min(bounds.minY, point.y),
        maxX: Math.max(bounds.maxX, point.x),
        maxY: Math.max(bounds.maxY, point.y),
      }),
      {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      }
    );
  }

  function drawCustomIsolationDraft(target, grid, maxSide) {
    if (!customIsolationDraft.points.length) {
      return;
    }

    target.save();
    target.strokeStyle = withAlpha(state.lineColor, 0.72);
    target.lineWidth = Math.max(1, (maxSide / 2953) * 2.4);
    target.setLineDash([target.lineWidth * 4, target.lineWidth * 2]);
    target.beginPath();
    customIsolationDraft.points.forEach((point, index) => {
      const canvasPoint = ratioToCanvas(point, grid);
      if (index === 0) {
        target.moveTo(canvasPoint.x, canvasPoint.y);
      } else {
        target.lineTo(canvasPoint.x, canvasPoint.y);
      }
    });
    if (customIsolationDraft.points.length >= 3) {
      target.closePath();
    }
    target.stroke();
    target.restore();
  }

  function hitIsolation(point) {
    const grid = getGrid(canvas.width, canvas.height, Math.min(canvas.width, canvas.height) * 0.055);
    const geos = getIsolationGeometries(grid);

    for (let index = geos.length - 1; index >= 0; index -= 1) {
      if (isInsideIsolation(point.x, point.y, geos[index], true)) {
        return geos[index];
      }
    }

    return null;
  }

  function downloadPng() {
    render(ctx, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      blob.arrayBuffer().then((buffer) => {
        const dpiBlob = new Blob([addPngDpi(buffer, state.dpi)], { type: "image/png" });
        const url = URL.createObjectURL(dpiBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = getExportFilename();
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      });
    }, "image/png");
  }

  function getExportFilename() {
    const baseName = importedImage.name ? stripExtension(importedImage.name) : "drawing";
    return `${safeFilenamePart(baseName)} isolated ${formatExportTimestamp(new Date())}.png`;
  }

  function stripExtension(filename) {
    return filename.replace(/\.[^/.]+$/, "");
  }

  function safeFilenamePart(value) {
    return String(value || "drawing")
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "drawing";
  }

  function formatExportTimestamp(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}-${pad(
      date.getMinutes()
    )}-${pad(date.getSeconds())}`;
  }

  function addPngDpi(buffer, dpi) {
    const source = new Uint8Array(buffer);
    const signatureLength = 8;
    const firstChunkLength = readUint32(source, signatureLength);
    const afterIhdr = signatureLength + 12 + firstChunkLength;
    const pixelsPerMeter = Math.round(dpi / 0.0254);
    const chunk = createPhysChunk(pixelsPerMeter);
    const existingPhys = findChunk(source, "pHYs");

    if (existingPhys) {
      const withoutPhys = new Uint8Array(source.length - existingPhys.length);
      withoutPhys.set(source.slice(0, existingPhys.start), 0);
      withoutPhys.set(source.slice(existingPhys.end), existingPhys.start);
      return insertBytes(withoutPhys, afterIhdr, chunk);
    }

    return insertBytes(source, afterIhdr, chunk);
  }

  function createPhysChunk(pixelsPerMeter) {
    const dataLength = 9;
    const chunk = new Uint8Array(12 + dataLength);
    writeUint32(chunk, 0, dataLength);
    writeAscii(chunk, 4, "pHYs");
    writeUint32(chunk, 8, pixelsPerMeter);
    writeUint32(chunk, 12, pixelsPerMeter);
    chunk[16] = 1;
    writeUint32(chunk, 17, crc32(chunk.slice(4, 17)));
    return chunk;
  }

  function findChunk(source, type) {
    let offset = 8;
    while (offset < source.length) {
      const length = readUint32(source, offset);
      const currentType = readAscii(source, offset + 4, 4);
      const end = offset + 12 + length;
      if (currentType === type) {
        return { start: offset, end, length: 12 + length };
      }
      offset = end;
    }
    return null;
  }

  function insertBytes(source, offset, insert) {
    const output = new Uint8Array(source.length + insert.length);
    output.set(source.slice(0, offset), 0);
    output.set(insert, offset);
    output.set(source.slice(offset), offset + insert.length);
    return output;
  }

  function readUint32(bytes, offset) {
    return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
  }

  function writeUint32(bytes, offset, value) {
    bytes[offset] = (value >>> 24) & 255;
    bytes[offset + 1] = (value >>> 16) & 255;
    bytes[offset + 2] = (value >>> 8) & 255;
    bytes[offset + 3] = value & 255;
  }

  function readAscii(bytes, offset, length) {
    let output = "";
    for (let i = 0; i < length; i += 1) {
      output += String.fromCharCode(bytes[offset + i]);
    }
    return output;
  }

  function writeAscii(bytes, offset, value) {
    for (let i = 0; i < value.length; i += 1) {
      bytes[offset + i] = value.charCodeAt(i);
    }
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc ^= bytes[i];
      for (let bit = 0; bit < 8; bit += 1) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function wireControls() {
    els.randomizeAll.addEventListener("click", randomizeAll);
    els.resetAllTop.addEventListener("click", resetAll);

    // A slider release, checkbox or select ends the current undo step.
    document.querySelector(".panel").addEventListener("change", endHistoryBurst);

    els.showGrid.addEventListener("change", () => {
      state.showGrid = els.showGrid.checked;
      commitChange();
    });
    els.gridSize.addEventListener("input", () => setRangeState("gridSize", els.gridSize, (value) => oddClamp(value, GRID_SIZE_MIN, GRID_SIZE_MAX, DEFAULT_STATE.gridSize)));
    els.reaction.addEventListener("input", () => setRangeState("reaction", els.reaction));

    [
      ["drawFill", "checked"],
      ["drawStroke", "checked"],
      ["transparentPaper", "checked"],
      ["transparentDrawing", "checked"],
      ["showImage", "checked"],
    ].forEach(([key, property]) => {
      els[key].addEventListener("change", () => {
        state[key] = els[key][property];
        commitChange();
      });
    });

    ["lineFillColor", "lineColor", "paperColor"].forEach((key) => {
      els[key].addEventListener("input", () => {
        state[key] = els[key].value;
        commitChange({ merge: key });
      });
    });

    els.fillWeight.addEventListener("input", () => setRangeState("fillWeight", els.fillWeight));
    els.strokeWeight.addEventListener("input", () => setRangeState("strokeWeight", els.strokeWeight));
    els.lineCap.addEventListener("change", () => {
      state.lineCap = validLineCap(els.lineCap.value) ? els.lineCap.value : "butt";
      commitChange();
    });
    els.lineJoin.addEventListener("change", () => {
      state.lineJoin = validLineJoin(els.lineJoin.value) ? els.lineJoin.value : "miter";
      commitChange();
    });
    els.randomLineCount.addEventListener("input", () => setRangeState("randomLineCount", els.randomLineCount));
    els.randomLineLength.addEventListener("input", () => setRangeState("randomLineLength", els.randomLineLength));

    els.undoLine.addEventListener("click", () => {
      state.paths.pop();
      commitChange();
    });

    els.clearLines.addEventListener("click", () => {
      state.paths = [];
      commitChange();
    });
    els.randomizeDrawing.addEventListener("click", randomizeDrawing);

    els.imageImport.addEventListener("change", handleImageImport);
    ["imageLinesHorizontal", "imageLinesVertical", "imageLinesDiagonal", "imageInvert"].forEach((key) => {
      els[key].addEventListener("change", () => {
        state[key] = els[key].checked;
        commitChange({ image: true });
      });
    });
    ["imageThreshold", "imageDetail", "imageScale", "imageOffsetX", "imageOffsetY", "imageBrightness", "imageContrast"].forEach((key) => {
      els[key].addEventListener("input", () => setImageState(key, els[key]));
    });
    els.clearImage.addEventListener("click", clearImportedImage);

    els.isolationSelect.addEventListener("change", () => {
      state.selectedIsolationId = els.isolationSelect.value;
      commitChange();
    });

    els.addIsolation.addEventListener("click", () => addIsolation(null));
    els.removeIsolation.addEventListener("click", removeSelectedIsolation);

    els.isolationEnabled.addEventListener("change", () => updateSelectedIsolation("enabled", els.isolationEnabled.checked));
    els.isolationOutline.addEventListener("change", () => updateSelectedIsolation("outline", els.isolationOutline.checked));
    els.isolationShape.addEventListener("change", () => {
      const item = getSelectedIsolation();
      item.shape = els.isolationShape.value;
      if (item.shape === "circle") {
        item.height = item.width;
        item.aspectRatio = 1;
      } else if (item.shape === "custom" && (!item.customPath || item.customPath.length < 3)) {
        setIsolationDrawMode(true);
      }
      if (!item.lockAspect && item.height > 0) {
        item.aspectRatio = item.width / item.height;
      }
      commitChange();
    });
    els.drawIsolationShape.addEventListener("click", () => setIsolationDrawMode(!isolationDrawMode));
    els.clearIsolationShape.addEventListener("click", clearCustomIsolationShape);
    els.isolationX.addEventListener("input", () => updateSelectedIsolation("x", clampNumber(els.isolationX.value, 0, 100, 50) / 100, "isolationX"));
    els.isolationY.addEventListener("input", () => updateSelectedIsolation("y", clampNumber(els.isolationY.value, 0, 100, 50) / 100, "isolationY"));
    els.isolationWidth.addEventListener("input", () => updateIsolationDimension("width", Number(els.isolationWidth.value), "isolationWidth"));
    els.isolationHeight.addEventListener("input", () => updateIsolationDimension("height", Number(els.isolationHeight.value), "isolationHeight"));
    els.isolationWidthNumber.addEventListener("input", () => updateIsolationDimension("width", Number(els.isolationWidthNumber.value), "isolationWidth"));
    els.isolationHeightNumber.addEventListener("input", () => updateIsolationDimension("height", Number(els.isolationHeightNumber.value), "isolationHeight"));
    els.isolationLockAspect.addEventListener("change", () => setIsolationAspectLock(els.isolationLockAspect.checked));
    els.isolationRatioNumber.addEventListener("input", () => setIsolationAspectRatio(Number(els.isolationRatioNumber.value)));
    els.isolationRotation.addEventListener("input", () => updateSelectedIsolation("rotation", Number(els.isolationRotation.value), "isolationRotation"));
    els.isolationForce.addEventListener("input", () => updateSelectedIsolation("force", Number(els.isolationForce.value), "isolationForce"));
    els.isolationGap.addEventListener("input", () => updateSelectedIsolation("gap", Number(els.isolationGap.value), "isolationGap"));
    els.isolationFill.addEventListener("change", () => updateSelectedIsolation("fill", els.isolationFill.checked));
    els.isolationFillColor.addEventListener("input", () => updateSelectedIsolation("fillColor", els.isolationFillColor.value, "isolationFillColor"));
    els.isolationStrokeColor.addEventListener("input", () => updateSelectedIsolation("strokeColor", els.isolationStrokeColor.value, "isolationStrokeColor"));
    els.isolationStrokeWidth.addEventListener("input", () => updateSelectedIsolation("strokeWidth", Number(els.isolationStrokeWidth.value), "isolationStrokeWidth"));

    els.centerIsolation.addEventListener("click", () => {
      const item = getSelectedIsolation();
      item.x = 0.5;
      item.y = 0.5;
      commitChange();
    });

    els.randomIsolation.addEventListener("click", randomizeSelectedIsolation);

    els.applySize.addEventListener("click", applyCanvasSizeFromInputs);
    els.canvasPreset.addEventListener("change", () => applyCanvasPreset(els.canvasPreset.value));
    [els.widthCm, els.heightCm, els.dpi].forEach((input) => {
      input.addEventListener("change", applyCanvasSizeFromInputs);
    });
    els.viewScale.addEventListener("change", updateViewScale);
    window.addEventListener("resize", updateViewScale);

    els.exportPng.addEventListener("click", downloadPng);
    els.shortcutsToggle.addEventListener("click", () => toggleShortcuts());
    document.addEventListener("keydown", handleShortcut);
    document.addEventListener("pointerdown", (event) => {
      if (!els.shortcuts.hidden && !els.shortcuts.contains(event.target) && event.target !== els.shortcutsToggle) {
        toggleShortcuts(false);
      }
    });

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId);
      }

      pointer.down = true;
      pointer.lastCell = "";
      pointer.activePath = null;

      if (isolationDrawMode) {
        pointer.mode = "customIsolation";
        startCustomIsolationShape(event);
        return;
      }

      const point = pointerToCanvas(event);
      const hit = hitIsolation(point);
      if (hit) {
        const mapped = pointerToGridRatio(event);
        state.selectedIsolationId = hit.id;
        syncControls();
        pointer.mode = "isolation";
        pointer.offsetX = hit.source.x - mapped.x;
        pointer.offsetY = hit.source.y - mapped.y;
        moveIsolationFromPointer(event);
      } else {
        pointer.mode = "line";
        startLine(event);
      }
    });

    canvas.addEventListener("pointermove", (event) => {
      pointer.hover = pointerToGridRatio(event);
      if (!pointer.down) {
        return;
      }

      if (pointer.mode === "isolation") {
        moveIsolationFromPointer(event);
      } else if (pointer.mode === "customIsolation") {
        addCustomIsolationPoint(event);
      } else if (pointer.mode === "line") {
        addLinePoint(event);
      }
    });

    canvas.addEventListener("pointerleave", () => {
      pointer.hover = null;
    });

    canvas.addEventListener("pointerup", (event) => {
      const mode = pointer.mode;
      pointer.down = false;
      pointer.mode = "";
      pointer.lastCell = "";
      pointer.activePath = null;
      if (mode === "customIsolation") {
        finishCustomIsolationShape();
      } else {
        commitChange();
      }
      if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    });

    canvas.addEventListener("pointercancel", () => {
      customIsolationDraft.active = false;
      customIsolationDraft.points = [];
      pointer.down = false;
      pointer.mode = "";
      pointer.lastCell = "";
      pointer.activePath = null;
      updateIsolationDrawUi();
      commitChange();
    });
  }

  function applyCanvasSizeFromInputs() {
    applyCanvasSize();
    commitChange();
  }

  function addIsolation(atPoint) {
    if (state.isolations.length >= MAX_ISOLATIONS) {
      return;
    }
    const current = getSelectedIsolation();
    const id = nextIsolationId();
    const spot = atPoint || findSpotNextTo(current);
    const item = normalizeIsolation(
      {
        ...current,
        id,
        enabled: true,
        outline: true,
        x: clamp(spot.x, 0, 1),
        y: clamp(spot.y, 0, 1),
      },
      state.isolations.length
    );
    state.isolations.push(item);
    state.selectedIsolationId = id;
    commitChange();
  }

  // Nearest free spot beside an object: right, left, below, above, then diagonals and further out.
  // Positions are in grid ratio.
  function findSpotNextTo(item) {
    const grid = getGrid(canvas.width, canvas.height, Math.min(canvas.width, canvas.height) * 0.055);
    const shortSide = Math.min(grid.width, grid.height);
    const extent = (Math.max(item.width, item.height) / 100) * shortSide;
    const spacing = extent + shortSide * 0.03;
    const stepX = spacing / grid.width;
    const stepY = spacing / grid.height;
    const halfX = extent / 2 / grid.width;
    const halfY = extent / 2 / grid.height;
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];
    const candidates = [];
    for (let ring = 1; ring <= 4; ring += 1) {
      directions.forEach(([dx, dy]) => {
        candidates.push({ x: item.x + dx * stepX * ring, y: item.y + dy * stepY * ring });
      });
    }

    const insideCanvas = (spot) => spot.x - halfX >= 0 && spot.x + halfX <= 1 && spot.y - halfY >= 0 && spot.y + halfY <= 1;
    const isFree = (spot) =>
      state.isolations.every((other) => {
        const otherExtent = (Math.max(other.width, other.height) / 100) * shortSide;
        const distance = Math.hypot((spot.x - other.x) * grid.width, (spot.y - other.y) * grid.height);
        return distance >= (extent + otherExtent) / 2;
      });

    return (
      candidates.find((spot) => insideCanvas(spot) && isFree(spot)) ||
      candidates.find(insideCanvas) || { x: item.x, y: item.y }
    );
  }

  function removeSelectedIsolation() {
    if (state.isolations.length <= 1) {
      return;
    }
    const index = state.isolations.findIndex((item) => item.id === state.selectedIsolationId);
    state.isolations = state.isolations.filter((item) => item.id !== state.selectedIsolationId);
    state.selectedIsolationId = state.isolations[Math.max(0, index - 1)].id;
    commitChange();
  }

  function nudgeSelectedIsolation(dx, dy) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }
    item.x = clamp(item.x + dx, 0, 1);
    item.y = clamp(item.y + dy, 0, 1);
    commitChange({ merge: "nudge" });
  }

  function toggleShortcuts(show) {
    const visible = typeof show === "boolean" ? show : els.shortcuts.hidden;
    els.shortcuts.hidden = !visible;
    els.shortcutsToggle.setAttribute("aria-expanded", String(visible));
  }

  function isTypingTarget(target) {
    if (!target || !target.tagName) {
      return false;
    }
    if (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
      return true;
    }
    return target.tagName === "INPUT" && !["range", "checkbox", "color", "file", "button"].includes(target.type);
  }

  function handleShortcut(event) {
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    if (mod && key === "z" && !isTypingTarget(event.target)) {
      event.preventDefault();
      endHistoryBurst();
      if (event.shiftKey) {
        redo();
      } else {
        undo();
      }
      return;
    }
    if (mod && key === "y" && !isTypingTarget(event.target)) {
      event.preventDefault();
      redo();
      return;
    }
    if (mod || event.altKey || isTypingTarget(event.target)) {
      return;
    }

    if (event.key === "Escape") {
      toggleShortcuts(false);
      if (isolationDrawMode) {
        setIsolationDrawMode(false);
      }
      return;
    }
    if (event.key === "?") {
      toggleShortcuts();
      return;
    }

    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[event.key]) {
      // Arrow keys on a focused slider keep moving that slider.
      if (event.target && event.target.type === "range") {
        return;
      }
      event.preventDefault();
      const step = event.shiftKey ? 0.05 : 0.005;
      nudgeSelectedIsolation(arrows[event.key][0] * step, arrows[event.key][1] * step);
      return;
    }

    if (key === "a") {
      addIsolation(pointer.hover);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeSelectedIsolation();
    } else if (key === "d") {
      setIsolationDrawMode(!isolationDrawMode);
    } else if (key === "g") {
      state.showGrid = !state.showGrid;
      commitChange();
    } else if (key === "i") {
      state.showImage = !state.showImage;
      commitChange();
    } else if (key === "r") {
      randomizeAll();
    } else if (key === "e") {
      downloadPng();
    }
  }

  function nextIsolationId() {
    let index = state.isolations.length + 1;
    while (state.isolations.some((item) => item.id === `iso-${index}`)) {
      index += 1;
    }
    return `iso-${index}`;
  }

  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    document.querySelectorAll(".mod-key").forEach((key) => {
      key.textContent = "Ctrl+";
    });
  }
  syncControls();
  applyCanvasSize();
  history.current = makeSnapshot();
  wireControls();
})();
