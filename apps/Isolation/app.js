(function () {
  "use strict";

  const CM_PER_INCH = 2.54;
  const MAX_PIXELS = 36_000_000;
  const MAX_PATHS = 120;
  const MAX_POINTS_PER_PATH = 1800;
  const MAX_CUSTOM_ISOLATION_POINTS = 900;
  const GRID_SIZE_MIN = 9;
  const GRID_SIZE_MAX = 201;
  const STORAGE_KEY = "isolation-field-state";

  const DEFAULT_STATE = {
    isolationModelVersion: 5,
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
    pixelSize: document.getElementById("pixelSize"),
    paperColor: document.getElementById("paperColor"),
    transparentPaper: document.getElementById("transparentPaper"),
    transparentDrawing: document.getElementById("transparentDrawing"),
    exportPng: document.getElementById("exportPng"),
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
  };
  let isolationDrawMode = false;
  const customIsolationDraft = {
    active: false,
    points: [],
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
      merged.isolations = saved.isolations.slice(0, 12).map((item, index) => normalizeIsolation(item, index));
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
    merged.isolationModelVersion = 5;

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
      scheduleRender();
      updateImageStatus();
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
    updateImageStatus();
    scheduleRender();
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

  function buildThresholdPaths(image, grid) {
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    const imageAspect = imageWidth / imageHeight;
    const longSide = clamp(Math.round(state.gridSize * state.imageDetail), 36, 280);
    const sampleWidth = imageAspect >= 1 ? longSide : Math.max(2, Math.round(longSide * imageAspect));
    const sampleHeight = imageAspect >= 1 ? Math.max(2, Math.round(longSide / imageAspect)) : longSide;
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sample = sampleCanvas.getContext("2d", { willReadFrequently: true });

    sample.clearRect(0, 0, sampleWidth, sampleHeight);
    sample.drawImage(image, 0, 0, sampleWidth, sampleHeight);

    const data = sample.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const paths = [];
    const maxRuns = 9000;
    const placement = getImagePlacement(image, grid);
    const threshold = state.imageThreshold;

    const toNorm = (x, y) => ({
      x: placement.x + (sampleWidth <= 1 ? 0.5 : x / (sampleWidth - 1)) * placement.width,
      y: placement.y + (sampleHeight <= 1 ? 0.5 : y / (sampleHeight - 1)) * placement.height,
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
            if (paths.length >= maxRuns) {
              return true;
            }
          }

          x += stepX;
          y += stepY;
        }

        if (runStart) {
          pushThresholdRun(runStart, lastActive, toNorm, paths);
          if (paths.length >= maxRuns) {
            return true;
          }
        }
      }

      return false;
    };

    const horizontalStarts = Array.from({ length: sampleHeight }, (_, y) => ({ x: 0, y }));
    const verticalStarts = Array.from({ length: sampleWidth }, (_, x) => ({ x, y: 0 }));
    const diagonalDownStarts = [
      ...Array.from({ length: sampleWidth }, (_, x) => ({ x, y: 0 })),
      ...Array.from({ length: Math.max(0, sampleHeight - 1) }, (_, index) => ({ x: 0, y: index + 1 })),
    ];
    const diagonalUpStarts = [
      ...Array.from({ length: sampleWidth }, (_, x) => ({ x, y: sampleHeight - 1 })),
      ...Array.from({ length: Math.max(0, sampleHeight - 1) }, (_, index) => ({ x: 0, y: sampleHeight - 2 - index })),
    ];

    if (state.imageLinesHorizontal && addRuns(horizontalStarts, 1, 0)) return paths;
    if (state.imageLinesVertical && addRuns(verticalStarts, 0, 1)) return paths;
    if (state.imageLinesDiagonal) {
      if (addRuns(diagonalDownStarts, 1, 1)) return paths;
      if (addRuns(diagonalUpStarts, 1, -1)) return paths;
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
    const width = clampNumber(item.width || item.size, 3, 60, 17);
    const fallbackHeight = width;
    const height = shape === "circle" ? width : clampNumber(item.height, 3, 60, fallbackHeight);
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

    let width = cmToPixels(state.widthCm, state.dpi);
    let height = cmToPixels(state.heightCm, state.dpi);
    const pixelCount = width * height;

    if (pixelCount > MAX_PIXELS) {
      const ratio = Math.sqrt(MAX_PIXELS / pixelCount);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
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
    els.widthCm.value = state.widthCm;
    els.heightCm.value = state.heightCm;
    els.dpi.value = state.dpi;
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
    els.isolationRatioNumber.value = Number(item.aspectRatio).toFixed(2);
    els.isolationX.value = Number((item.x * 100).toFixed(1));
    els.isolationY.value = Number((item.y * 100).toFixed(1));
    els.isolationWidth.value = item.width;
    els.isolationWidthNumber.value = Number(item.width).toFixed(1);
    els.isolationWidthValue.textContent = formatControlValue(item.width);
    els.isolationHeight.value = item.height;
    els.isolationHeightNumber.value = Number(item.height).toFixed(1);
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

  function formatControlValue(value) {
    return Number(value).toFixed(1).replace(".0", "");
  }

  function getSelectedIsolation() {
    return state.isolations.find((item) => item.id === state.selectedIsolationId) || state.isolations[0];
  }

  function updateSelectedIsolation(key, value) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }
    item[key] = value;
    if (key === "enabled") {
      syncIsolationSelect();
    }
    syncSelectedIsolationControls();
    scheduleRender();
    saveState();
  }

  function updateIsolationDimension(key, value) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }
    const nextValue = clampNumber(value, 3, 60, item[key]);

    if (key === "width") {
      item.width = nextValue;
      if (item.shape === "circle") {
        item.height = nextValue;
        item.aspectRatio = 1;
      } else if (item.lockAspect) {
        item.height = clamp(item.width / item.aspectRatio, 3, 60);
      }
    } else {
      item.height = nextValue;
      if (item.shape === "circle") {
        item.width = nextValue;
        item.aspectRatio = 1;
      } else if (item.lockAspect) {
        item.width = clamp(item.height * item.aspectRatio, 3, 60);
      }
    }

    if (!item.lockAspect && item.height > 0) {
      item.aspectRatio = item.width / item.height;
    }

    syncSelectedIsolationControls();
    scheduleRender();
    saveState();
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
    syncSelectedIsolationControls();
    saveState();
  }

  function setIsolationAspectRatio(value) {
    const item = getSelectedIsolation();
    if (!item) {
      return;
    }
    item.aspectRatio = item.shape === "circle" ? 1 : clampNumber(value, 0.05, 20, item.aspectRatio || 1);
    item.lockAspect = true;
    item.height = item.shape === "circle" ? item.width : clamp(item.width / item.aspectRatio, 3, 60);
    syncSelectedIsolationControls();
    scheduleRender();
    saveState();
  }

  function setRangeState(key, input, parser) {
    state[key] = parser ? parser(input.value) : Number(input.value);
    syncOutputs();
    scheduleRender();
    saveState();
  }

  function setImageState(key, input, parser) {
    state[key] = parser ? parser(input.value) : Number(input.value);
    importedImage.dirty = true;
    syncOutputs();
    scheduleRender();
    saveState();
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Reset still applies even when browser storage is blocked.
    }
    syncControls();
    applyCanvasSize();
    scheduleRender();
    saveState();
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
    scheduleRender();
    saveState();
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
    syncOutputs();
    scheduleRender();
    saveState();
  }

  function randomizeDrawing() {
    const random = seededRandom((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    state.paths = buildRandomLinePaths(random);
    syncOutputs();
    scheduleRender();
    saveState();
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
      const width = grid.width * (item.width / 100);
      const height = grid.height * (item.height / 100);
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
      return geo;
    });
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
      if (state.drawStroke && state.drawFill) {
        strokeReactiveLine(layer, path.points, grid, geos, withAlpha(state.lineColor, alpha), fillWidth + outlineWidth * 2);
        strokeReactiveLine(layer, path.points, grid, geos, withAlpha(state.lineFillColor, alpha), fillWidth);
      } else if (state.drawFill) {
        strokeReactiveLine(layer, path.points, grid, geos, withAlpha(state.lineFillColor, alpha), fillWidth);
      } else if (state.drawStroke) {
        strokeReactiveLine(layer, path.points, grid, geos, withAlpha(state.lineColor, alpha), outlineWidth);
      }
    });

    layer.restore();
    target.drawImage(layerCanvas, 0, 0);
  }

  function strokeReactiveLine(target, points, grid, geos, color, weight) {
    if (!points.length) {
      return;
    }

    const minStep = Math.min(grid.stepX, grid.stepY) * 0.38;
    target.strokeStyle = color;
    target.lineWidth = weight;
    target.beginPath();

    let drawing = false;
    let last = null;

    if (points.length === 1) {
      const single = gridRatioToCanvas(points[0], grid);
      const reacted = reactPoint(single.x, single.y, geos, minStep);
      target.moveTo(reacted.x - 0.01, reacted.y);
      target.lineTo(reacted.x + 0.01, reacted.y);
      target.stroke();
      return;
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
          target.moveTo(reacted.x, reacted.y);
          drawing = true;
        } else {
          target.lineTo(reacted.x, reacted.y);
        }
        last = reacted;
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
      const field = getIsolationField(output.x, output.y, geo);
      const distance = Math.max(field.signedDistance, 0);
      const shapeRadius = Math.max(geo.width, geo.height) / 2;
      const reach = geo.gap + (geo.gap * 2.3 + shapeRadius * 0.55) * reaction * geo.force;

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
    let best = null;
    let bestDistance = Infinity;

    loops.forEach((loop) => {
      if (!loop || loop.length < 2) {
        return;
      }

      for (let index = 0; index < loop.length; index += 1) {
        const start = loop[index];
        const end = loop[(index + 1) % loop.length];
        const point = closestPointOnSegment(x, y, start, end);
        const distance = (x - point.x) * (x - point.x) + (y - point.y) * (y - point.y);
        if (distance < bestDistance) {
          best = point;
          bestDistance = distance;
        }
      }
    });

    return best || { x: geo.x, y: geo.y };
  }

  function closestPointOnSegment(x, y, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = dx * dx + dy * dy;
    const t = length > 0 ? clamp(((x - start.x) * dx + (y - start.y) * dy) / length, 0, 1) : 0;

    return {
      x: start.x + dx * t,
      y: start.y + dy * t,
    };
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
    const cos = Math.cos(-geo.rotation);
    const sin = Math.sin(-geo.rotation);
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
      syncIsolationSelect();
      syncOutputs();
      scheduleRender();
      saveState();
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
    const width = clamp(rawWidth, 0.03, 0.6);
    const height = clamp(rawHeight, 0.03, 0.6);
    const pathWidth = Math.max(rawWidth, 0.03);
    const pathHeight = Math.max(rawHeight, 0.03);
    const centerX = clamp((bounds.minX + bounds.maxX) / 2, 0, 1);
    const centerY = clamp((bounds.minY + bounds.maxY) / 2, 0, 1);

    item.shape = "custom";
    item.x = centerX;
    item.y = centerY;
    item.width = width * 100;
    item.height = height * 100;
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
    syncOutputs();
    scheduleRender();
    saveState();
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

    els.showGrid.addEventListener("change", () => {
      state.showGrid = els.showGrid.checked;
      scheduleRender();
      saveState();
    });
    els.gridSize.addEventListener("input", () => setRangeState("gridSize", els.gridSize, (value) => oddClamp(value, GRID_SIZE_MIN, GRID_SIZE_MAX, DEFAULT_STATE.gridSize)));
    els.reaction.addEventListener("input", () => setRangeState("reaction", els.reaction));

    els.drawFill.addEventListener("change", () => {
      state.drawFill = els.drawFill.checked;
      scheduleRender();
      saveState();
    });

    els.lineFillColor.addEventListener("input", () => {
      state.lineFillColor = els.lineFillColor.value;
      scheduleRender();
      saveState();
    });

    els.fillWeight.addEventListener("input", () => setRangeState("fillWeight", els.fillWeight));

    els.drawStroke.addEventListener("change", () => {
      state.drawStroke = els.drawStroke.checked;
      scheduleRender();
      saveState();
    });

    els.lineColor.addEventListener("input", () => {
      state.lineColor = els.lineColor.value;
      scheduleRender();
      saveState();
    });

    els.strokeWeight.addEventListener("input", () => setRangeState("strokeWeight", els.strokeWeight));
    els.lineCap.addEventListener("change", () => {
      state.lineCap = validLineCap(els.lineCap.value) ? els.lineCap.value : "butt";
      scheduleRender();
      saveState();
    });
    els.lineJoin.addEventListener("change", () => {
      state.lineJoin = validLineJoin(els.lineJoin.value) ? els.lineJoin.value : "miter";
      scheduleRender();
      saveState();
    });
    els.randomLineCount.addEventListener("input", () => setRangeState("randomLineCount", els.randomLineCount));
    els.randomLineLength.addEventListener("input", () => setRangeState("randomLineLength", els.randomLineLength));

    els.undoLine.addEventListener("click", () => {
      state.paths.pop();
      scheduleRender();
      saveState();
    });

    els.clearLines.addEventListener("click", () => {
      state.paths = [];
      scheduleRender();
      saveState();
    });
    els.randomizeDrawing.addEventListener("click", randomizeDrawing);

    els.imageImport.addEventListener("change", handleImageImport);
    ["imageLinesHorizontal", "imageLinesVertical", "imageLinesDiagonal"].forEach((key) => {
      els[key].addEventListener("change", () => {
        state[key] = els[key].checked;
        importedImage.dirty = true;
        scheduleRender();
        saveState();
      });
    });
    els.imageThreshold.addEventListener("input", () => setImageState("imageThreshold", els.imageThreshold));
    els.imageDetail.addEventListener("input", () => setImageState("imageDetail", els.imageDetail));
    els.imageScale.addEventListener("input", () => setImageState("imageScale", els.imageScale));
    els.imageOffsetX.addEventListener("input", () => setImageState("imageOffsetX", els.imageOffsetX));
    els.imageOffsetY.addEventListener("input", () => setImageState("imageOffsetY", els.imageOffsetY));
    els.imageBrightness.addEventListener("input", () => setImageState("imageBrightness", els.imageBrightness));
    els.imageContrast.addEventListener("input", () => setImageState("imageContrast", els.imageContrast));
    els.imageInvert.addEventListener("change", () => {
      state.imageInvert = els.imageInvert.checked;
      importedImage.dirty = true;
      scheduleRender();
      saveState();
    });
    els.showImage.addEventListener("change", () => {
      state.showImage = els.showImage.checked;
      scheduleRender();
      saveState();
    });
    els.clearImage.addEventListener("click", clearImportedImage);

    els.isolationSelect.addEventListener("change", () => {
      state.selectedIsolationId = els.isolationSelect.value;
      syncSelectedIsolationControls();
      scheduleRender();
      saveState();
    });

    els.addIsolation.addEventListener("click", () => {
      const current = getSelectedIsolation();
      const id = nextIsolationId();
      const phase = ((state.isolations.length + state.paths.length + 1) * 0.61803398875) % 1;
      const item = normalizeIsolation(
        {
          ...current,
          id,
          enabled: true,
          outline: true,
          x: 0.12 + ((phase * 1.41) % 1) * 0.76,
          y: 0.12 + ((phase * 2.17 + 0.2) % 1) * 0.76,
        },
        state.isolations.length
      );
      state.isolations.push(item);
      state.selectedIsolationId = id;
      syncIsolationSelect();
      syncOutputs();
      scheduleRender();
      saveState();
    });

    els.removeIsolation.addEventListener("click", () => {
      if (state.isolations.length <= 1) {
        return;
      }
      state.isolations = state.isolations.filter((item) => item.id !== state.selectedIsolationId);
      state.selectedIsolationId = state.isolations[0].id;
      syncIsolationSelect();
      syncOutputs();
      scheduleRender();
      saveState();
    });

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
      syncSelectedIsolationControls();
      scheduleRender();
      saveState();
    });
    els.drawIsolationShape.addEventListener("click", () => setIsolationDrawMode(!isolationDrawMode));
    els.clearIsolationShape.addEventListener("click", clearCustomIsolationShape);
    els.isolationX.addEventListener("input", () => updateSelectedIsolation("x", clampNumber(els.isolationX.value, 0, 100, 50) / 100));
    els.isolationY.addEventListener("input", () => updateSelectedIsolation("y", clampNumber(els.isolationY.value, 0, 100, 50) / 100));
    els.isolationWidth.addEventListener("input", () => updateIsolationDimension("width", Number(els.isolationWidth.value)));
    els.isolationHeight.addEventListener("input", () => updateIsolationDimension("height", Number(els.isolationHeight.value)));
    els.isolationWidthNumber.addEventListener("input", () => updateIsolationDimension("width", Number(els.isolationWidthNumber.value)));
    els.isolationHeightNumber.addEventListener("input", () => updateIsolationDimension("height", Number(els.isolationHeightNumber.value)));
    els.isolationLockAspect.addEventListener("change", () => setIsolationAspectLock(els.isolationLockAspect.checked));
    els.isolationRatioNumber.addEventListener("input", () => setIsolationAspectRatio(Number(els.isolationRatioNumber.value)));
    els.isolationRotation.addEventListener("input", () => updateSelectedIsolation("rotation", Number(els.isolationRotation.value)));
    els.isolationForce.addEventListener("input", () => updateSelectedIsolation("force", Number(els.isolationForce.value)));
    els.isolationGap.addEventListener("input", () => updateSelectedIsolation("gap", Number(els.isolationGap.value)));
    els.isolationFill.addEventListener("change", () => updateSelectedIsolation("fill", els.isolationFill.checked));
    els.isolationFillColor.addEventListener("input", () => updateSelectedIsolation("fillColor", els.isolationFillColor.value));
    els.isolationStrokeColor.addEventListener("input", () => updateSelectedIsolation("strokeColor", els.isolationStrokeColor.value));
    els.isolationStrokeWidth.addEventListener("input", () => updateSelectedIsolation("strokeWidth", Number(els.isolationStrokeWidth.value)));

    els.centerIsolation.addEventListener("click", () => {
      const item = getSelectedIsolation();
      item.x = 0.5;
      item.y = 0.5;
      syncSelectedIsolationControls();
      scheduleRender();
      saveState();
    });

    els.randomIsolation.addEventListener("click", randomizeSelectedIsolation);

    els.applySize.addEventListener("click", applyCanvasSize);
    els.viewScale.addEventListener("change", updateViewScale);
    window.addEventListener("resize", updateViewScale);

    els.paperColor.addEventListener("input", () => {
      state.paperColor = els.paperColor.value;
      scheduleRender();
      saveState();
    });

    [els.transparentPaper, els.transparentDrawing].forEach((input) => {
      input.addEventListener("change", () => {
        state[input.id] = input.checked;
        scheduleRender();
        saveState();
      });
    });

    els.exportPng.addEventListener("click", downloadPng);

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
        syncIsolationSelect();
        syncSelectedIsolationControls();
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

    canvas.addEventListener("pointerup", (event) => {
      if (pointer.mode === "customIsolation") {
        finishCustomIsolationShape();
      }
      pointer.down = false;
      pointer.mode = "";
      pointer.lastCell = "";
      pointer.activePath = null;
      saveState();
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
      scheduleRender();
      saveState();
    });
  }

  function nextIsolationId() {
    let index = state.isolations.length + 1;
    while (state.isolations.some((item) => item.id === `iso-${index}`)) {
      index += 1;
    }
    return `iso-${index}`;
  }

  syncControls();
  applyCanvasSize();
  wireControls();
})();
