type WavePrecomp = {
  A: Float32Array;
  B: Float32Array;
  omega: number;
  width: number;
  height: number;
};

export type ParticlesOnWall = {
  particlePositions: number[];
  totalParticles: number;
};

export interface DiffractionWall {
  x: number;
  wallWidth: number;
  slitSize: number;
  color: string;
}

export interface ReceptorWall {
  x: number;
  width: number;
  color: string;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface AnimationParams {
  diffractionWall: DiffractionWall;
  receptorWall: ReceptorWall;
  canvasDimensions: CanvasDimensions;
  slitMinimum: number;
  slitMaximum: number;
  contrast: number[];
  wavelength: number[];
  waveSpeed: number[];
  lightColor: [number, number, number];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  isActive: boolean;
}

function contrast255(x: number, c: number, mid = 128) {
  x = (x - mid) * c + mid;
  return x < 0 ? 0 : x > 255 ? 255 : x;
}

function gamma255(x: number, gamma: number) {
  const t = x / 255;
  return Math.max(0, Math.min(255, Math.pow(t, gamma) * 255));
}

export function drawDiffractionWall(ctx: CanvasRenderingContext2D, params: AnimationParams) {
  const { diffractionWall, canvasDimensions } = params;
  const x = diffractionWall.x;
  const diffractionWallWidth = diffractionWall.wallWidth;
  const diffractionSlitWidth = diffractionWall.slitSize;

  ctx.fillStyle = diffractionWall.color;
  ctx.fillRect(x, 0, diffractionWallWidth, canvasDimensions.height / 2 - diffractionSlitWidth / 2);
  ctx.fillRect(
    x,
    canvasDimensions.height / 2 + diffractionSlitWidth / 2,
    diffractionWallWidth,
    canvasDimensions.height,
  );
}

export function drawReceptorWall(ctx: CanvasRenderingContext2D, params: AnimationParams) {
  const { receptorWall, canvasDimensions } = params;
  ctx.fillStyle = receptorWall.color;
  ctx.fillRect(receptorWall.x, 0, receptorWall.width, canvasDimensions.height);
}

const calculateLightIntensity = (y: number, params: AnimationParams) => {
  const { diffractionWall, receptorWall, canvasDimensions, wavelength } = params;

  const a = diffractionWall.slitSize;
  const D = receptorWall.x - diffractionWall.x - diffractionWall.wallWidth;

  const dy = y - canvasDimensions.height / 2;
  const sinTheta = dy / Math.sqrt(dy * dy + D * D);

  const beta = (Math.PI * a * sinTheta) / wavelength[0];

  if (Math.abs(beta) < 1e-10) return receptorWall.width * 0.8;

  return receptorWall.width * 0.8 * (Math.sin(beta) / beta) ** 2;
};

export function drawLightIntensityOnWall(
  ctx: CanvasRenderingContext2D,
  particlesOnWall: ParticlesOnWall,
  params: AnimationParams,
) {
  const { receptorWall } = params;
  ctx.fillStyle = "rgba(255, 181, 32, 1.0)";
  const maxHeight = receptorWall.width * 0.8;

  function gaussianSmooth(histogram: number[], sigma: number) {
    const radius = Math.ceil(sigma * 3);
    const kernel: number[] = [];
    let kernelSum = 0;

    for (let i = -radius; i <= radius; i++) {
      const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
      kernel.push(weight);
      kernelSum += weight;
    }
    for (let i = 0; i < kernel.length; i++) kernel[i] /= kernelSum;

    const smoothed = new Array(histogram.length).fill(0);
    for (let i = 0; i < histogram.length; i++) {
      for (let j = 0; j < kernel.length; j++) {
        const srcIndex = i + j - radius;
        if (srcIndex >= 0 && srcIndex < histogram.length) {
          smoothed[i] += histogram[srcIndex] * kernel[j];
        }
      }
    }
    return smoothed;
  }

  const { particlePositions } = particlesOnWall;
  const sigma = Math.min(1 + Math.sqrt(particlesOnWall.totalParticles) * 0.005, 1);
  const smoothed = gaussianSmooth(particlePositions, sigma);

  let maxBin = 0;
  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] > maxBin) maxBin = smoothed[i];
  }

  for (let y = 0; y < smoothed.length; y++) {
    const lightIntensity = Math.min((smoothed[y] / maxBin) * maxHeight, maxHeight);
    ctx.fillRect(receptorWall.x, y, lightIntensity, 2);
  }
}

export function drawLightIntensityCurve(ctx: CanvasRenderingContext2D, params: AnimationParams) {
  const { receptorWall, canvasDimensions } = params;
  const path = new Path2D();

  for (let y = 0; y < canvasDimensions.height; y += 0.5) {
    const intensity = calculateLightIntensity(y, params);
    path.rect(receptorWall.x, y, intensity, 0.5);
  }

  ctx.fillStyle = "rgba(32, 146, 245, 1.0)";
  ctx.fill(path); // single draw call
}

export function drawLightIntensityGradient(ctx: CanvasRenderingContext2D, params: AnimationParams) {
  const { receptorWall, canvasDimensions } = params;

  for (let y = 0; y < canvasDimensions.height; y += 5) {
    const lightIntensity = calculateLightIntensity(y, params);
    ctx.fillStyle = `rgba(0, 65, 206, ${Math.min(lightIntensity / 10, 1.0)})`;
    ctx.fillRect(receptorWall.x, y, receptorWall.width, 5);
  }
}

export function randomVelocityXY(speed: number, particlePositionY: number, params: AnimationParams) {
  const { canvasDimensions, diffractionWall, receptorWall } = params;
  const xMin = 0;
  const xMax = canvasDimensions.height;
  const maxPDF = receptorWall.width * 0.8;
  speed = speed * Math.random() + 2;
  while (true) {
    const randomHeightOnReceptorWall = (Math.random() - 0.5) * (xMax - xMin + 4000) + canvasDimensions.height / 2;
    const randomYForCalculation = Math.random() * maxPDF;

    let sincSquared;
    if (Math.abs(randomHeightOnReceptorWall) < 1e-10) {
      sincSquared = maxPDF;
    } else {
      sincSquared = calculateLightIntensity(randomHeightOnReceptorWall, params);
    }

    if (randomYForCalculation <= sincSquared) {
      const angle = Math.atan(
        (randomHeightOnReceptorWall - particlePositionY) /
          (receptorWall.x - diffractionWall.x - diffractionWall.wallWidth),
      );
      return [speed * Math.cos(angle), speed * Math.sin(angle)];
    }
  }
}

function precomputeInitialRipple(
  width: number,
  height: number,
  wavelength: number,
  period: number,
  phase = 0.785398,
): WavePrecomp {
  const A = new Float32Array(width);
  const B = new Float32Array(width);

  const k = (2 * Math.PI) / wavelength;
  const omega = (2 * Math.PI) / period;

  for (let x = 0; x < width; x++) {
    const phi = k * x - phase;
    A[x] = Math.cos(phi);
    B[x] = Math.sin(phi);
  }

  return { A, B, omega, width, height };
}

export function makeInitialRippleRenderer(scaleFactor: number, outW: number, outH: number, rgb = [255, 231, 0]) {
  const simW = Math.round(outW / scaleFactor);
  const simH = Math.round(outH / scaleFactor);

  const simCanvas = document.createElement("canvas");
  simCanvas.width = simW;
  simCanvas.height = simH;
  const simCtx = simCanvas.getContext("2d", { willReadFrequently: true })!;

  const phase = 0.785398;

  // Allocate once and pre-fill RGB channels
  const img = new ImageData(simW, simH);
  const data = img.data;
  for (let p = 0; p < simW * simH; p++) {
    const i = p * 4;
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }

  let pre: WavePrecomp | null = null;
  let lastSlitWidth = NaN;
  let lastCanvasH = NaN;

  return function draw(
    ctx: CanvasRenderingContext2D,
    timeMilliseconds: number,
    x0: number,
    y0: number,
    wavelength: number,
    speed: number,
    params: AnimationParams,
  ) {
    const canvasH = params.canvasDimensions.height;
    const slitWidth = params.diffractionWall.slitSize;

    if (!pre || slitWidth !== lastSlitWidth || canvasH !== lastCanvasH) {
      lastSlitWidth = slitWidth;
      lastCanvasH = canvasH;
      pre = precomputeInitialRipple(simW, simH, wavelength / scaleFactor, 1 / speed, phase);
    }

    const time = timeMilliseconds / 1000;
    const ot = pre.omega * time;
    const cosine = Math.cos(ot);
    const sine = Math.sin(ot);

    const A = pre.A;
    const B = pre.B;
    const brightness = 150;

    for (let x = 0; x < simW; x++) {
      let v = (A[x] * cosine + B[x] * sine) * brightness;
      if (v < 0) v = 0;
      else if (v > 255) v = 255;
      v = gamma255(v, params.contrast[0]);
      v = contrast255(v, 1.3, 80);
      const alpha = v | 0;

      for (let y = 0; y < simH; y++) {
        data[(y * simW + x) * 4 + 3] = alpha;
      }
    }

    simCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(simCanvas, x0, y0, outW, outH);
  };
}

function precomputeWaveAB(
  width: number,
  height: number,
  slitTop: number,
  slitBottom: number,
  wavelength: number,
  period: number,
  sourceStep: number,
  phase = 0.785398,
): WavePrecomp {
  const nPix = width * height;
  const A = new Float32Array(nPix);
  const B = new Float32Array(nPix);

  const k = (2 * Math.PI) / wavelength;
  const omega = (2 * Math.PI) / period;

  const wavePointSources: number[] = [];
  for (let pointSource = slitTop; pointSource < slitBottom; pointSource += sourceStep)
    wavePointSources.push(pointSource);

  for (let y = 0; y < height / 2; y++) {
    const row = y * width;

    for (let x = 0; x < width; x++) {
      const p = row + x;

      let sumA = 0;
      let sumB = 0;

      for (let sourceIndex = 0; sourceIndex < wavePointSources.length; sourceIndex++) {
        const sy = wavePointSources[sourceIndex];
        const dy = y - sy;
        const dx = x;

        const r = Math.hypot(dx, dy);
        const inc = 1;
        const invDen = 1 / Math.sqrt(r + 7);
        const phi = k * r - phase;

        sumA += inc * invDen * Math.cos(phi);
        sumB += inc * invDen * Math.sin(phi);
      }

      A[p] = sumA;
      B[p] = sumB;
    }
  }

  const halfHeight = height / 2;
  for (let y = 0; y < halfHeight; y++) {
    const mirrorY = height - 1 - y;
    const sourceRow = y * width;
    const destRow = mirrorY * width;

    for (let x = 0; x < width; x++) {
      const sourceP = sourceRow + x;
      const destP = destRow + x;

      A[destP] = A[sourceP];
      B[destP] = B[sourceP];
    }
  }

  return { A, B, omega, width, height };
}

export function makeRippleRenderer(scaleFactor: number, outW: number, outH: number, rgb = [255, 231, 0]) {
  const simW = Math.round(outW / scaleFactor);
  const simH = Math.round(outH / scaleFactor);

  const img = new ImageData(simW, simH);
  const data = img.data;

  for (let p = 0; p < simW * simH; p++) {
    const i = p * 4;
    data[i + 0] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
    data[i + 3] = 255;
  }

  const simCanvas = document.createElement("canvas");
  simCanvas.width = simW;
  simCanvas.height = simH;
  const simCtx = simCanvas.getContext("2d", { willReadFrequently: true })!;

  const sourceStep = 5;
  const phase = 5;

  let pre: WavePrecomp | null = null;
  let lastSlitWidth = NaN;
  let lastCanvasH = NaN;

  const numberOfPixels = simW * simH;

  return function draw(
    ctx: CanvasRenderingContext2D,
    timeMilliseconds: number,
    x0: number,
    y0: number,
    wavelength: number,
    speed: number,
    params: AnimationParams,
  ) {
    const canvasH = params.canvasDimensions.height;
    const slitWidth = params.diffractionWall.slitSize;
    const slitWidthSim = slitWidth / scaleFactor;

    if (!pre || slitWidth !== lastSlitWidth || canvasH !== lastCanvasH) {
      lastSlitWidth = slitWidth;
      lastCanvasH = canvasH;

      const slitTopSim = simH / 2 - slitWidthSim / 2;
      const slitBottomSim = simH / 2 + slitWidthSim / 2;

      pre = precomputeWaveAB(
        simW,
        simH,
        slitTopSim,
        slitBottomSim,
        wavelength / scaleFactor,
        1 / speed,
        sourceStep / scaleFactor,
        phase,
      );
    }

    const time = timeMilliseconds / 1000;
    const ot = pre.omega * time;
    const c = Math.cos(ot);
    const s = Math.sin(ot);

    const A = pre.A;
    const B = pre.B;
    const brightness = 100;

    let alphaIndex = 3;
    for (let p = 0; p < numberOfPixels; p++, alphaIndex += 4) {
      let v = (A[p] * c + B[p] * s) * brightness;
      if (v < 0) v = 0;
      else if (v > 255) v = 255;
      v = gamma255(v, params.contrast[0]);
      v = contrast255(v, 1.3, 80);
      data[alphaIndex] = v | 0;
    }

    simCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(simCanvas, x0, y0, outW, outH);
  };
}

function resetParticle(particle: Particle, canvasDimensions: CanvasDimensions): void {
  particle.vx = 5 * Math.random() + 2;
  particle.vy = 0;
  particle.x = 0;
  particle.y = canvasDimensions.height * Math.random();
}

function isInSlit(particle: Particle, canvasDimensions: CanvasDimensions, diffractionWall: DiffractionWall): boolean {
  const center = canvasDimensions.height / 2;
  return particle.y >= center - diffractionWall.slitSize / 2 && particle.y <= center + diffractionWall.slitSize / 2;
}

function isOutOfBounds(particle: Particle, canvasDimensions: CanvasDimensions, receptorWall: ReceptorWall): boolean {
  return particle.x < 0 || particle.x > receptorWall.x || particle.y < 0 || particle.y > canvasDimensions.height;
}

function handleWallCollision(
  particle: Particle,
  canvasDimensions: CanvasDimensions,
  diffractionWall: DiffractionWall,
  params: AnimationParams,
): void {
  if (isInSlit(particle, canvasDimensions, diffractionWall)) {
    const newVelocity = randomVelocityXY(5, particle.y, params);
    particle.vx = newVelocity[0];
    particle.vy = newVelocity[1];
  } else {
    resetParticle(particle, canvasDimensions);
  }
}

const gradientCache = new Map<number, CanvasGradient>();

export function animateParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  params: AnimationParams,
  deltaTimeMilliseconds: number,
  animationSpeed: number,
): number[] {
  const { receptorWall, diffractionWall, canvasDimensions } = params;
  const yPositionOfParticlesOnWall: number[] = [];

  particles.forEach((particle) => {
    const prevX = particle.x;

    particle.x += particle.vx * ((deltaTimeMilliseconds * animationSpeed) / 8.333);
    particle.y += particle.vy * ((deltaTimeMilliseconds * animationSpeed) / 8.333);

    const crossedWall = prevX < diffractionWall.x && particle.x >= diffractionWall.x;

    if (crossedWall) {
      handleWallCollision(particle, canvasDimensions, diffractionWall, params);
    }

    if (particle.x > receptorWall.x) {
      if (particle.y > 0 && particle.y < canvasDimensions.height) {
        yPositionOfParticlesOnWall.push(particle.y);
      }
      resetParticle(particle, canvasDimensions);
      return;
    }

    if (isOutOfBounds(particle, canvasDimensions, receptorWall)) {
      resetParticle(particle, canvasDimensions);
    }

    if (particle.isActive) {
      let gradient = gradientCache.get(particle.hue);
      if (!gradient) {
        gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 2);
        gradient.addColorStop(0, `hsla(${particle.hue}, 80%, 60%, 0.8)`);
        gradient.addColorStop(0.4, `hsla(${particle.hue}, 80%, 50%, 0.6)`);
        gradient.addColorStop(0.6, `hsla(${particle.hue}, 80%, 40%, 0.01)`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 80%, 40%, 0)`);
        gradientCache.set(particle.hue, gradient);
      }
      // Translate to particle position, draw, restore
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  return yPositionOfParticlesOnWall;
}

export function blurIntersectionBetweenWaves(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement | null,
  params: AnimationParams,
) {
  if (!canvas) return;

  const { diffractionWall, canvasDimensions } = params;

  const x = diffractionWall.x - 10;
  const y = canvasDimensions.height / 2 - diffractionWall.slitSize / 2;
  const width = 15;
  const height = diffractionWall.slitSize;

  ctx.save();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.filter = "blur(4px)";
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = "none";

  ctx.restore();
}
