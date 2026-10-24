const RGB_WAVELENGTHS = [
  { key: "blue", label: "蓝光 450 nm", wavelengthNm: 450, color: "#2563eb" },
  { key: "green", label: "绿光 550 nm", wavelengthNm: 550, color: "#059669" },
  { key: "red", label: "红光 650 nm", wavelengthNm: 650, color: "#dc2626" },
];

const INPUT_DEFAULTS = {
  focalLengthMm: 50,
  aperture: 2.8,
  focusDistanceM: 3,
  cocMm: 0.02,
  sensorWidthMm: 36,
  sensorHeightMm: 24,
  resolutionWidthPx: 6000,
  resolutionHeightPx: 4000,
};

const finiteOrNull = (value) => (Number.isFinite(value) ? value : null);

const clampPositive = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function calculateAiryDisk({ aperture, wavelengthNm }) {
  const wavelengthMm = wavelengthNm / 1_000_000;
  const diameterMm = 2.44 * wavelengthMm * aperture;

  return {
    wavelengthNm,
    diameterMm,
    radiusMm: diameterMm / 2,
  };
}

export function calculateDepthOfField({
  focalLengthMm,
  aperture,
  focusDistanceM,
  cocMm,
}) {
  const focalLength = focalLengthMm;
  const focusDistanceMm = focusDistanceM * 1000;
  const hyperfocalMm = (focalLength * focalLength) / (aperture * cocMm) + focalLength;
  const nearLimitMm =
    (hyperfocalMm * focusDistanceMm) /
    (hyperfocalMm + (focusDistanceMm - focalLength));
  const farDenominator = hyperfocalMm - (focusDistanceMm - focalLength);
  const farIsInfinite = farDenominator <= 0;
  const farLimitMm = farIsInfinite
    ? Infinity
    : (hyperfocalMm * focusDistanceMm) / farDenominator;
  const totalDepthMm = farIsInfinite ? Infinity : farLimitMm - nearLimitMm;

  return {
    hyperfocalM: hyperfocalMm / 1000,
    nearLimitM: nearLimitMm / 1000,
    farLimitM: farIsInfinite ? Infinity : farLimitMm / 1000,
    totalDepthM: farIsInfinite ? Infinity : totalDepthMm / 1000,
    frontDepthM: focusDistanceM - nearLimitMm / 1000,
    rearDepthM: farIsInfinite ? Infinity : farLimitMm / 1000 - focusDistanceM,
    farIsInfinite,
    cocMm,
  };
}

export function calculateDiffractionAdjustedDof({
  focalLengthMm,
  aperture,
  focusDistanceM,
  cocMm,
  wavelengthNm,
}) {
  const airyDisk = calculateAiryDisk({ aperture, wavelengthNm });
  const diffractionLimited = airyDisk.diameterMm >= cocMm;
  const allowedDefocusCocMm = diffractionLimited
    ? 0
    : Math.sqrt(cocMm * cocMm - airyDisk.diameterMm * airyDisk.diameterMm);

  return {
    airyDisk,
    diffractionLimited,
    allowedDefocusCocMm,
    depthOfField: diffractionLimited
      ? null
      : calculateDepthOfField({
          focalLengthMm,
          aperture,
          focusDistanceM,
          cocMm: allowedDefocusCocMm,
        }),
  };
}

export function calculatePixelMetrics({
  sensorWidthMm,
  sensorHeightMm,
  resolutionWidthPx,
  resolutionHeightPx,
  cocMm,
  airyDiameterMm,
}) {
  const pixelPitchXUm = (sensorWidthMm / resolutionWidthPx) * 1000;
  const pixelPitchYUm = (sensorHeightMm / resolutionHeightPx) * 1000;
  const pixelPitchUm = pixelPitchXUm;
  const pixelPitchMm = pixelPitchUm / 1000;
  const sensorAreaCm2 = (sensorWidthMm / 10) * (sensorHeightMm / 10);
  const megapixels = (resolutionWidthPx * resolutionHeightPx) / 1_000_000;

  return {
    pixelPitchUm,
    pixelPitchXUm,
    pixelPitchYUm,
    pixelDensityMpPerCm2: megapixels / sensorAreaCm2,
    megapixels,
    cocPixels: cocMm / pixelPitchMm,
    airyPixels: airyDiameterMm / pixelPitchMm,
  };
}

export function buildSweepSeries({
  mode,
  sweepMode,
  focalLengthMm,
  aperture,
  focusDistanceM,
  cocMm,
  sensorWidthMm,
  sensorHeightMm,
  resolutionWidthPx,
  resolutionHeightPx,
}) {
  const points = [];
  const count = 48;
  const selectedMode = mode || sweepMode || "coc";
  const airy550 = calculateAiryDisk({ aperture, wavelengthNm: 550 });
  const geometricDof = calculateDepthOfField({
    focalLengthMm,
    aperture,
    focusDistanceM,
    cocMm,
  });

  if (selectedMode === "pixel-density") {
    for (let index = 0; index < count; index += 1) {
      const scale = 0.45 + (index / (count - 1)) * 2.35;
      const widthPx = resolutionWidthPx * scale;
      const heightPx = resolutionHeightPx * scale;
      const metrics = calculatePixelMetrics({
        sensorWidthMm,
        sensorHeightMm,
        resolutionWidthPx: widthPx,
        resolutionHeightPx: heightPx,
        cocMm,
        airyDiameterMm: airy550.diameterMm,
      });

      points.push({
        x: metrics.pixelDensityMpPerCm2,
        label: `${Math.round(widthPx)} x ${Math.round(heightPx)}`,
        totalDepthM: geometricDof.totalDepthM,
        pixelPitchUm: metrics.pixelPitchUm,
        cocPixels: metrics.cocPixels,
        airyPixels: metrics.airyPixels,
      });
    }

    return { mode: "pixel-density", points };
  }

  for (let index = 0; index < count; index += 1) {
    const scanCocMm = cocMm * (0.25 + (index / (count - 1)) * 2.75);
    const dof = calculateDepthOfField({
      focalLengthMm,
      aperture,
      focusDistanceM,
      cocMm: scanCocMm,
    });

    points.push({
      x: scanCocMm,
      cocMm: scanCocMm,
      totalDepthM: dof.totalDepthM,
      nearLimitM: dof.nearLimitM,
      farLimitM: dof.farLimitM,
      farIsInfinite: dof.farIsInfinite,
    });
  }

  return { mode: "coc", points };
}

const formatNumber = (value, digits = 2) => {
  if (value === Infinity) return "∞";
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
};

const formatFlexible = (value, unit, digits = 2) => `${formatNumber(value, digits)} ${unit}`;

const getInputs = () => {
  const form = document.querySelector("[data-dof-form]");
  const data = new FormData(form);

  return {
    focalLengthMm: clampPositive(data.get("focalLengthMm"), INPUT_DEFAULTS.focalLengthMm),
    aperture: clampPositive(data.get("aperture"), INPUT_DEFAULTS.aperture),
    focusDistanceM: clampPositive(data.get("focusDistanceM"), INPUT_DEFAULTS.focusDistanceM),
    cocMm: clampPositive(data.get("cocMm"), INPUT_DEFAULTS.cocMm),
    sensorWidthMm: clampPositive(data.get("sensorWidthMm"), INPUT_DEFAULTS.sensorWidthMm),
    sensorHeightMm: clampPositive(data.get("sensorHeightMm"), INPUT_DEFAULTS.sensorHeightMm),
    resolutionWidthPx: clampPositive(
      data.get("resolutionWidthPx"),
      INPUT_DEFAULTS.resolutionWidthPx,
    ),
    resolutionHeightPx: clampPositive(
      data.get("resolutionHeightPx"),
      INPUT_DEFAULTS.resolutionHeightPx,
    ),
    sweepMode: data.get("sweepMode") || "coc",
  };
};

const setText = (selector, text) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
};

const setMetric = (key, value, detail) => {
  const element = document.querySelector(`[data-metric="${key}"]`);
  if (!element) return;
  element.querySelector("strong").textContent = value;
  element.querySelector("span").textContent = detail;
};

const describeDof = (dof) =>
  [
    `超焦距 ${formatFlexible(dof.hyperfocalM, "m")}`,
    `近界 ${formatFlexible(dof.nearLimitM, "m")}`,
    `远界 ${dof.farIsInfinite ? "∞" : formatFlexible(dof.farLimitM, "m")}`,
  ].join(" · ");

const buildPath = (points, xGetter, yGetter, width, height, padding) => {
  const finitePoints = points.filter((point) => Number.isFinite(yGetter(point)));
  if (finitePoints.length === 0) return "";

  const xs = finitePoints.map(xGetter);
  const ys = finitePoints.map(yGetter);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  return finitePoints
    .map((point, index) => {
      const x = padding + ((xGetter(point) - minX) / spanX) * (width - padding * 2);
      const y =
        height -
        padding -
        ((yGetter(point) - minY) / spanY) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
};

const renderSweepChart = (series) => {
  const svg = document.querySelector("[data-sweep-chart]");
  if (!svg) return;

  const width = 760;
  const height = 310;
  const padding = 34;
  const axis = `<path d="M ${padding} ${height - padding} H ${width - padding} M ${padding} ${padding} V ${height - padding}" class="axis" />`;

  if (series.mode === "pixel-density") {
    setText(
      "[data-chart-note]",
      "像素密度升高时，物理景深保持不变；同一个 CoC 或 Airy 斑会覆盖更多像素。",
    );
    const legend = document.querySelector("[data-chart-legend]");
    if (legend) {
      legend.innerHTML = `
        <span><i class="coc"></i>CoC 像素尺度</span>
        <span><i class="near"></i>Airy 像素尺度</span>
      `;
    }
    const cocPath = buildPath(
      series.points,
      (point) => point.x,
      (point) => point.cocPixels,
      width,
      height,
      padding,
    );
    const airyPath = buildPath(
      series.points,
      (point) => point.x,
      (point) => point.airyPixels,
      width,
      height,
      padding,
    );

    svg.innerHTML = `
      ${axis}
      <path d="${cocPath}" class="line line-coc" />
      <path d="${airyPath}" class="line line-airy" />
      <text x="${width - padding - 130}" y="${height - 14}" class="chart-label">MP/cm²</text>
    `;
    return;
  }

  setText(
    "[data-chart-note]",
    "手动 CoC 越大，可接受模糊越宽，计算得到的景深越大。",
  );
  const legend = document.querySelector("[data-chart-legend]");
  if (legend) {
    legend.innerHTML = `
      <span><i class="depth"></i>总景深</span>
      <span><i class="near"></i>近景深界限</span>
    `;
  }
  const depthPath = buildPath(
    series.points,
    (point) => point.cocMm,
    (point) => point.totalDepthM,
    width,
    height,
    padding,
  );
  const nearPath = buildPath(
    series.points,
    (point) => point.cocMm,
    (point) => point.nearLimitM,
    width,
    height,
    padding,
  );

  svg.innerHTML = `
    ${axis}
    <path d="${depthPath}" class="line line-depth" />
    <path d="${nearPath}" class="line line-near" />
    <text x="${width - padding - 72}" y="${height - 14}" class="chart-label">CoC mm</text>
  `;
};

const renderDiffractionRows = (inputs) => {
  const container = document.querySelector("[data-diffraction-rows]");
  if (!container) return;

  container.innerHTML = RGB_WAVELENGTHS.map((item) => {
    const result = calculateDiffractionAdjustedDof({
      ...inputs,
      wavelengthNm: item.wavelengthNm,
    });
    const depthLabel = result.diffractionLimited
      ? "超限"
      : result.depthOfField.farIsInfinite
        ? "∞"
        : `${formatNumber(result.depthOfField.totalDepthM, 2)} m`;
    const allowedLabel = result.diffractionLimited
      ? "0.000 mm"
      : `${formatNumber(result.allowedDefocusCocMm, 4)} mm`;

    return `
      <article class="diffraction-row" style="--row-color:${item.color}">
        <div>
          <b>${item.label}</b>
          <span>Airy ${formatNumber(result.airyDisk.diameterMm * 1000, 2)} μm · 允许离焦 CoC ${allowedLabel}</span>
        </div>
        <strong>${depthLabel}</strong>
      </article>
    `;
  }).join("");
};

const renderWarnings = (inputs) => {
  const warnings = [];
  const airyValues = RGB_WAVELENGTHS.map((item) =>
    calculateAiryDisk({ aperture: inputs.aperture, wavelengthNm: item.wavelengthNm }),
  );
  const overBudget = airyValues.filter((airy) => airy.diameterMm >= inputs.cocMm);

  if (overBudget.length > 0) {
    warnings.push(
      `衍射超限：${overBudget
        .map((item) => `${item.wavelengthNm} nm`)
        .join("、")} 的 Airy 直径已经大于或等于手动 CoC。`,
    );
  }

  warnings.push(
    "像素密度不会直接改变物理景深；它改变的是同一个 CoC 或 Airy 斑在传感器上覆盖多少像素。",
  );

  const container = document.querySelector("[data-warnings]");
  if (!container) return;
  container.innerHTML = warnings.map((warning) => `<p>${warning}</p>`).join("");
};

const updateFormula = (inputs, dof) => {
  setText(
    "[data-formula]",
    `H = f² / (N·c) + f = ${formatFlexible(dof.hyperfocalM, "m")}；近界 = Hs / (H + s - f)；远界 = Hs / (H - s + f)。当前 c = ${formatNumber(inputs.cocMm, 4)} mm，s = ${formatNumber(inputs.focusDistanceM, 2)} m。衍射修正按 c_defocus = sqrt(c² - Airy²) 并排计算。`,
  );
};

const update = () => {
  const inputs = getInputs();
  const geometricDof = calculateDepthOfField(inputs);
  const airyGreen = calculateAiryDisk({ aperture: inputs.aperture, wavelengthNm: 550 });
  const pixelMetrics = calculatePixelMetrics({
    ...inputs,
    airyDiameterMm: airyGreen.diameterMm,
  });
  const sweep = buildSweepSeries(inputs);

  setMetric("total-depth", formatFlexible(geometricDof.totalDepthM, "m"), "几何总景深");
  setMetric("near-limit", formatFlexible(geometricDof.nearLimitM, "m"), "近景深界限");
  setMetric(
    "far-limit",
    geometricDof.farIsInfinite ? "∞" : formatFlexible(geometricDof.farLimitM, "m"),
    "远景深界限",
  );
  setMetric("hyperfocal", formatFlexible(geometricDof.hyperfocalM, "m"), "超焦距");
  setMetric("pixel-pitch", formatFlexible(pixelMetrics.pixelPitchUm, "μm", 2), "像素间距");
  setMetric(
    "pixel-density",
    formatFlexible(pixelMetrics.pixelDensityMpPerCm2, "MP/cm²", 2),
    `${formatNumber(pixelMetrics.megapixels, 1)} MP`,
  );
  setMetric("coc-pixels", formatFlexible(pixelMetrics.cocPixels, "px", 2), "CoC 对应像素");
  setMetric("airy-pixels", formatFlexible(pixelMetrics.airyPixels, "px", 2), "550 nm Airy 对应像素");

  setText("[data-geometric-summary]", describeDof(geometricDof));
  renderDiffractionRows(inputs);
  renderWarnings(inputs);
  renderSweepChart(sweep);
  updateFormula(inputs, geometricDof);
};

const initialize = () => {
  const form = document.querySelector("[data-dof-form]");
  if (!form) return;

  Object.entries(INPUT_DEFAULTS).forEach(([name, value]) => {
    const input = form.elements.namedItem(name);
    if (input) input.value = value;
  });

  form.addEventListener("input", update);
  form.addEventListener("change", update);
  update();
};

if (typeof document !== "undefined") {
  initialize();
}

export const defaults = INPUT_DEFAULTS;
export const wavelengths = RGB_WAVELENGTHS;
