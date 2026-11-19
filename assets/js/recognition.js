"use strict";

// Browser-based digit recognition. Uses TensorFlow.js when available,
// with a local k-nearest-neighbours classifier if TF.js cannot train/load.
async function initRecognition() {
  const canvas = document.querySelector("#digit-canvas");
  const predict = document.querySelector("#predict-btn");
  const clear = document.querySelector("#clear-digit");
  const status = document.querySelector("#model-status");
  const result = document.querySelector("#predicted-digit");
  const bars = document.querySelector("#prediction-bars");
  if (![canvas, predict, clear, status, result, bars].every(Boolean)) return;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let drawing = false;
  let hasInk = false;
  let classifier = null;
  let modelReady = false;
  let loading = true;

  function paintBlack() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 19;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }
  function refreshButton() {
    predict.disabled = !modelReady || !hasInk;
  }
  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height
    };
  }
  paintBlack();
  predict.disabled = true;

  canvas.addEventListener("pointerdown", event => {
    event.preventDefault();
    drawing = true;
    hasInk = true;
    canvas.setPointerCapture(event.pointerId);
    const p = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    refreshButton();
  });
  canvas.addEventListener("pointermove", event => {
    if (!drawing) return;
    const p = getPoint(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  canvas.addEventListener("pointerup", () => { drawing = false; });
  canvas.addEventListener("pointercancel", () => { drawing = false; });
  clear.addEventListener("click", () => {
    paintBlack();
    hasInk = false;
    result.textContent = "—";
    bars.replaceChildren();
    refreshButton();
    status.textContent = modelReady ? "Ready. Draw a digit." :
      (loading ? "Preparing recognition model…" : "Recognition unavailable.");
  });

  // Crop to the ink bounds and centre the drawn digit so that a drawing
  // does not need to be placed in exactly the same spot as the examples.
  function vector(source) {
    const srcCtx = source.getContext("2d", { willReadFrequently: true });
    const w = source.width, h = source.height;
    const pixels = srcCtx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const offset = (y * w + x) * 4;
      if (pixels[offset] > 45) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    const target = document.createElement("canvas");
    target.width = target.height = 28;
    const t = target.getContext("2d", { willReadFrequently: true });
    t.fillStyle = "#000";
    t.fillRect(0, 0, 28, 28);
    if (maxX < 0) return new Float32Array(784);
    const boxW = maxX - minX + 1, boxH = maxY - minY + 1;
    const scale = 20 / Math.max(boxW, boxH);
    const dw = boxW * scale, dh = boxH * scale;
    t.imageSmoothingEnabled = true;
    t.imageSmoothingQuality = "high";
    t.drawImage(source, minX, minY, boxW, boxH,
      (28 - dw) / 2, (28 - dh) / 2, dw, dh);
    const data = t.getImageData(0, 0, 28, 28).data;
    const output = new Float32Array(784);
    for (let i = 0; i < 784; i++) output[i] = data[i * 4] / 255;
    return output;
  }

  function makeExample(digit, font, size, weight, angle, shift) {
    const c = document.createElement("canvas");
    c.width = c.height = 112;
    const x = c.getContext("2d");
    x.fillStyle = "#000"; x.fillRect(0, 0, 112, 112);
    x.translate(56 + shift, 56 - shift / 2);
    x.rotate(angle);
    x.fillStyle = "#fff";
    x.textBaseline = "middle";
    x.textAlign = "center";
    x.font = `${weight} ${size}px ${font}`;
    x.fillText(String(digit), 0, 3);
    return vector(c);
  }

  function makeDataset() {
    const samples = [];
    const fonts = ["Arial", "Georgia", "sans-serif", "monospace"];
    for (let d = 0; d <= 9; d++) {
      for (const font of fonts) {
        for (let i = 0; i < 12; i++) {
          const angle = ((i % 5) - 2) * 0.07;
          const size = 68 + (i % 4) * 4;
          const weight = i % 3 === 0 ? "normal" : "bold";
          samples.push({ label: d, values: makeExample(d, font, size, weight, angle, (i % 3) - 1) });
        }
      }
    }
    return samples;
  }

  function makeKnn(samples) {
    return input => {
      const distances = samples.map(sample => {
        let distance = 0;
        for (let i = 0; i < input.length; i++) {
          const delta = input[i] - sample.values[i];
          distance += delta * delta;
        }
        return { digit: sample.label, distance };
      });
      distances.sort((a, b) => a.distance - b.distance);
      const scores = Array(10).fill(0);
      for (const { digit, distance } of distances.slice(0, 7)) {
        scores[digit] += 1 / (distance + 0.01);
      }
      const sum = scores.reduce((a, b) => a + b, 0);
      return scores.map(score => score / sum);
    };
  }

  function drawScores(scores) {
    bars.replaceChildren();
    scores.forEach((score, digit) => {
      const row = document.createElement("div");
      row.className = "score-row";
      const label = document.createElement("span");
      label.textContent = String(digit);
      const track = document.createElement("div");
      track.className = "score-track";
      const fill = document.createElement("div");
      fill.className = "score-fill";
      fill.style.width = `${(score * 100).toFixed(1)}%`;
      const percent = document.createElement("span");
      percent.textContent = `${Math.round(score * 100)}%`;
      track.append(fill);
      row.append(label, track, percent);
      bars.append(row);
    });
  }

  // Always prepare a local classifier first, so drawing works offline.
  status.textContent = "Preparing local digit examples…";
  await new Promise(resolve => requestAnimationFrame(resolve));
  let samples;
  try {
    samples = makeDataset();
    classifier = makeKnn(samples);
    modelReady = true;
    loading = false;
    refreshButton();
    status.textContent = "Ready. Draw a digit and click Recognize digit.";
  } catch (error) {
    console.error("Local recognition setup failed:", error);
    loading = false;
    status.textContent = "Recognition could not start. Please check the browser console.";
    return;
  }

  predict.addEventListener("click", () => {
    if (!modelReady || !hasInk || !classifier) return;
    try {
      const scores = classifier(vector(canvas));
      const best = scores.indexOf(Math.max(...scores));
      result.textContent = String(best);
      drawScores(scores);
      status.textContent = "Prediction complete. This experimental model compares your digit with generated examples; results may be inaccurate for handwriting.";
    } catch (error) {
      console.error("Prediction failed:", error);
      status.textContent = "Prediction failed. Please check the browser console.";
    }
  });
}
