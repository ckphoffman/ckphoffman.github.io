import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSweepSeries,
  calculateAiryDisk,
  calculateDepthOfField,
  calculateDiffractionAdjustedDof,
  calculatePixelMetrics,
} from "../app.js";

const nearly = (actual, expected, tolerance) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("calculates standard geometric depth of field for a full-frame 50mm setup", () => {
  const result = calculateDepthOfField({
    focalLengthMm: 50,
    aperture: 2.8,
    focusDistanceM: 3,
    cocMm: 0.03,
  });

  nearly(result.hyperfocalM, 29.81, 0.02);
  nearly(result.nearLimitM, 2.73, 0.01);
  nearly(result.farLimitM, 3.33, 0.01);
  nearly(result.totalDepthM, 0.6, 0.02);
  assert.equal(result.farIsInfinite, false);
});

test("reports infinite far limit when focus distance reaches the hyperfocal boundary", () => {
  const result = calculateDepthOfField({
    focalLengthMm: 24,
    aperture: 16,
    focusDistanceM: 10,
    cocMm: 0.03,
  });

  assert.equal(result.farIsInfinite, true);
  assert.equal(result.farLimitM, Infinity);
  assert.equal(result.totalDepthM, Infinity);
});

test("keeps physical depth of field stable while resolution changes pixel-scale metrics", () => {
  const lowResolution = calculatePixelMetrics({
    sensorWidthMm: 36,
    sensorHeightMm: 24,
    resolutionWidthPx: 3000,
    resolutionHeightPx: 2000,
    cocMm: 0.02,
    airyDiameterMm: 0.00375,
  });
  const highResolution = calculatePixelMetrics({
    sensorWidthMm: 36,
    sensorHeightMm: 24,
    resolutionWidthPx: 6000,
    resolutionHeightPx: 4000,
    cocMm: 0.02,
    airyDiameterMm: 0.00375,
  });
  const dof = {
    focalLengthMm: 50,
    aperture: 2.8,
    focusDistanceM: 3,
    cocMm: 0.02,
  };

  assert.equal(calculateDepthOfField(dof).totalDepthM, calculateDepthOfField(dof).totalDepthM);
  nearly(lowResolution.pixelPitchUm, 12, 0.001);
  nearly(highResolution.pixelPitchUm, 6, 0.001);
  nearly(highResolution.cocPixels, lowResolution.cocPixels * 2, 0.001);
  nearly(highResolution.airyPixels, lowResolution.airyPixels * 2, 0.001);
});

test("flags diffraction over the total blur budget for very small CoC values", () => {
  const airy = calculateAiryDisk({ aperture: 16, wavelengthNm: 650 });
  const result = calculateDiffractionAdjustedDof({
    focalLengthMm: 50,
    aperture: 16,
    focusDistanceM: 3,
    cocMm: 0.005,
    wavelengthNm: 650,
  });

  assert.ok(airy.diameterMm > 0.005);
  assert.equal(result.diffractionLimited, true);
  assert.equal(result.allowedDefocusCocMm, 0);
  assert.equal(result.depthOfField, null);
});

test("builds CoC and pixel-density sweep series with stable geometric semantics", () => {
  const cocSweep = buildSweepSeries({
    mode: "coc",
    focalLengthMm: 50,
    aperture: 2.8,
    focusDistanceM: 3,
    cocMm: 0.02,
    sensorWidthMm: 36,
    sensorHeightMm: 24,
    resolutionWidthPx: 6000,
    resolutionHeightPx: 4000,
  });
  const densitySweep = buildSweepSeries({
    mode: "pixel-density",
    focalLengthMm: 50,
    aperture: 2.8,
    focusDistanceM: 3,
    cocMm: 0.02,
    sensorWidthMm: 36,
    sensorHeightMm: 24,
    resolutionWidthPx: 6000,
    resolutionHeightPx: 4000,
  });

  assert.equal(cocSweep.mode, "coc");
  assert.ok(cocSweep.points.length >= 30);
  assert.ok(cocSweep.points[0].totalDepthM < cocSweep.points.at(-1).totalDepthM);
  assert.equal(densitySweep.mode, "pixel-density");
  assert.ok(densitySweep.points.length >= 30);
  assert.ok(densitySweep.points[0].cocPixels < densitySweep.points.at(-1).cocPixels);
  nearly(densitySweep.points[0].totalDepthM, densitySweep.points.at(-1).totalDepthM, 0.000001);
});

test("accepts the form sweepMode field when building sweep series", () => {
  const series = buildSweepSeries({
    sweepMode: "pixel-density",
    focalLengthMm: 50,
    aperture: 2.8,
    focusDistanceM: 3,
    cocMm: 0.02,
    sensorWidthMm: 36,
    sensorHeightMm: 24,
    resolutionWidthPx: 6000,
    resolutionHeightPx: 4000,
  });

  assert.equal(series.mode, "pixel-density");
});
