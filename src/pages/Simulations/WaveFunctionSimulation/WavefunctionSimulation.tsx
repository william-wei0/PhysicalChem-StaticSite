import "../../Lessons/styles/lessons.css";
import Slider from "../../../components/simulationControls/Slider";
import SimulationControls from "../../../components/simulationControls/SimulationControls";
import SimulationButton from "@/components/simulationControls/SimulationButton";
import { useRef, useState, useEffect, useMemo } from "react";
import { useMatches } from "react-router-dom";
import { useLayoutContext } from "@/hooks/useLayoutContext";
import { useSimulationLayoutContext } from "../../../context/useSimulationLayoutContext";

type CanvasDimensions = {
  width: number;
  height: number;
};

type Particle = {
  quantumNumber: number;
};

type AnimationParams = {
  canvasDimensions: CanvasDimensions;
  waveAmplitude: number[];
  wellWidth: number[];
  wellBaseHeight: number[];
  leftBoundary: number;
  rightBoundary: number;
  horizontalGridLines: number;
  tickMarks: number;
  waveColor: [number, number, number];
  waveThickness: number;
  isRainbow: boolean;
  isFilled: boolean[];
};

type WavefunctionSimulationProps = {
  onTaskComplete?: (taskId: string) => void;
};

function drawGridHorizontal(ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
  const {
    horizontalGridLines: horizontal_lines,
    leftBoundary: left_boundary,
    rightBoundary: right_boundary,
    wellBaseHeight,
  } = animationParams;
  ctx.lineWidth = 1;

  for (let i = 0; i < horizontal_lines; i++) {
    ctx.beginPath();
    ctx.moveTo(left_boundary, (wellBaseHeight[0] * i) / horizontal_lines);
    ctx.lineTo(right_boundary, (wellBaseHeight[0] * i) / horizontal_lines);

    ctx.strokeStyle = `rgba(200, 200, 200, 0.5)`;
    ctx.stroke();
  }

  ctx.lineWidth = 1.0;
}

function drawTickMarks(ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
  const { leftBoundary, wellWidth, tickMarks, wellBaseHeight } = animationParams;
  ctx.lineWidth = 2;

  for (let i = 1; i < tickMarks; i++) {
    const x = leftBoundary + (wellWidth[0] * i) / tickMarks;
    ctx.beginPath();
    ctx.moveTo(x, wellBaseHeight[0] - 8);
    ctx.lineTo(x, wellBaseHeight[0] + 8);

    ctx.strokeStyle = `rgba(200, 200, 200, 1)`;
    ctx.stroke();
  }
  ctx.lineWidth = 1.0;
}

function drawGraphLabels(ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
  const { canvasDimensions, wellBaseHeight, leftBoundary, wellWidth } = animationParams;
  ctx.font = "30px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("Position (x)", canvasDimensions.width / 2, wellBaseHeight[0] + 40);
  ctx.fillText("0", leftBoundary, wellBaseHeight[0] + 40);
  ctx.fillText("L", leftBoundary + wellWidth[0], wellBaseHeight[0] + 40);

  ctx.save();
  ctx.translate(leftBoundary - 25, wellBaseHeight[0] / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Wave Function (ψ)", 0, 0);

  ctx.restore();
}

function drawSimulationLabel(ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
  const { canvasDimensions } = animationParams;
  ctx.font = "35px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("Wave Function (ψ)", canvasDimensions.width / 2, 50);
}

function draw_well(ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
  const { leftBoundary, wellBaseHeight, rightBoundary } = animationParams;
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(leftBoundary, 0);
  ctx.lineTo(leftBoundary, wellBaseHeight[0]);
  ctx.lineTo(rightBoundary, wellBaseHeight[0]);
  ctx.lineTo(rightBoundary, 0);

  ctx.strokeStyle = `rgba(200, 200, 200)`;
  ctx.stroke();
  ctx.lineWidth = 1.0;
}

function drawWave(ctx: CanvasRenderingContext2D, animationParams: AnimationParams, particle: Particle) {
  function drawFilledWaveLine(x: number, y: number, ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
    const { wellBaseHeight } = animationParams;
    ctx.beginPath();
    ctx.moveTo(x, wellBaseHeight[0]);
    ctx.lineTo(x, wellBaseHeight[0] - y);
    ctx.stroke();
  }

  const { wellWidth, leftBoundary, isRainbow, isFilled, wellBaseHeight, waveColor, waveThickness } = animationParams;
  ctx.strokeStyle = `rgba(${waveColor[0]},${waveColor[1]},${waveColor[2]},1.0)`;
  ctx.lineWidth = waveThickness;
  ctx.beginPath();
  ctx.moveTo(animationParams.leftBoundary, animationParams.wellBaseHeight[0]);
  const points = 4500;

  for (let i = 0; i < points; i++) {
    const x = (i * wellWidth[0]) / points + leftBoundary;
    const y = animationParams.waveAmplitude[0] * 0.6 * Math.sin((i / points) * particle.quantumNumber * Math.PI);

    if (isRainbow) {
      const hue = ((y / animationParams.waveAmplitude[0] / 1.8) * 360) % 360;
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    }

    if (isFilled[0]) drawFilledWaveLine(x, y, ctx, animationParams);
    else ctx.lineTo(x, wellBaseHeight[0] - y);
  }

  if (!isFilled[0]) {
    ctx.stroke();
  }
}
const LARGE_CANVAS: CanvasDimensions = { width: 1700, height: 800 };
const SMALL_CANVAS: CanvasDimensions = { width: 1400, height: 800 };

export default function WavefunctionSimulation({ onTaskComplete }: WavefunctionSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const BACKGROUND_COLOR = "rgba(0, 0, 0, 1)";
  const { availableWidth } = useLayoutContext();
  const { windowWidth, windowHeight } = useSimulationLayoutContext();

  const matches = useMatches();
  const isFullscreen = matches.some((m) => (m.handle as { isFullscreen?: boolean })?.isFullscreen);
  const CANVAS_DIMENSIONS = useMemo<CanvasDimensions>(() => {
    if (isFullscreen) {
      return { width: windowWidth, height: windowHeight };
    }
    return availableWidth > 1500 ? LARGE_CANVAS : SMALL_CANVAS;
  }, [isFullscreen, windowWidth, windowHeight, availableWidth]);

  const [particle, setParticle] = useState<Particle>({
    quantumNumber: 5,
  });
  const [waveAmplitude, setWaveAmplitude] = useState([300]);
  const wellWidth = useMemo(() => [(CANVAS_DIMENSIONS.width * 7) / 10], [CANVAS_DIMENSIONS]);
  const [wellBaseHeight, setWellBaseHeight] = useState([500]);
  const [isFilled, setIsFilled] = useState([true]);
  const animationFrameRef = useRef<number>(0);

  const animationParams = useMemo<AnimationParams>(
    () => ({
      canvasDimensions: CANVAS_DIMENSIONS,
      waveAmplitude,
      wellWidth,
      wellBaseHeight,
      leftBoundary: (CANVAS_DIMENSIONS.width - wellWidth[0]) / 2.0,
      rightBoundary: (CANVAS_DIMENSIONS.width - wellWidth[0]) / 2.0 + wellWidth[0],
      horizontalGridLines: 6,
      tickMarks: 6,
      waveColor: [28, 90, 190],
      waveThickness: 5,
      isRainbow: false,
      isFilled,
    }),
    [waveAmplitude, wellWidth, wellBaseHeight, CANVAS_DIMENSIONS, isFilled],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, CANVAS_DIMENSIONS.width, CANVAS_DIMENSIONS.height);

      drawWave(ctx, animationParams, particle);
      draw_well(ctx, animationParams);
      drawGridHorizontal(ctx, animationParams);
      drawGraphLabels(ctx, animationParams);
      drawSimulationLabel(ctx, animationParams);
      drawTickMarks(ctx, animationParams);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [CANVAS_DIMENSIONS, animationParams, particle]);

  const handleQuantumNumberChange = (energy: number[]) => {
    const taskMap: Record<number, string> = {
      1: "setQuantumNumber1Wavefunction",
      3: "setQuantumNumber3Wavefunction",
      5: "setQuantumNumber5Wavefunction",
      7: "setQuantumNumber7Wavefunction",
      9: "setQuantumNumber9Wavefunction",
    };
    const taskId = taskMap[energy[0]];
    if (taskId) onTaskComplete?.(taskId);

    setParticle((prev) => ({ ...prev, quantumNumber: energy[0] }));
  };
  return (
    <div className="simulationCanvasLayout">
      <div
        ref={containerRef}
        className="canvasContainer"
        style={{
          width: CANVAS_DIMENSIONS.width,
          height: CANVAS_DIMENSIONS.height,
        }}
      >
        <SimulationControls
          controllableSimulationVariables={
            <div className="scrollContainer max-h-[700px]">
              <SimulationButton onClick={() => setIsFilled((prev) => [!prev[0]])} className="mx-4 mb-4 mt-2">
                {isFilled[0] ? "Hide Filled Wave" : "Show Filled Wave"}
              </SimulationButton>
              <Slider
                key={"Quantum Number (n)"}
                value={[particle.quantumNumber]}
                onValueChange={handleQuantumNumberChange}
                label="Quantum Number (n)"
                min={1}
                max={10}
              />
              <Slider
                key={"Wave Amplitude"}
                value={waveAmplitude}
                onValueChange={setWaveAmplitude}
                label="Wave Amplitude"
                min={100}
                max={500}
                step={1}
              />
              <Slider
                key={"Well Height"}
                value={wellBaseHeight}
                onValueChange={setWellBaseHeight}
                label="Well Height"
                min={200}
                max={CANVAS_DIMENSIONS.height - 200}
                step={0.01}
              />
            </div>
          }
        />
        <div className="canvasScrollPane">
          {/*-6 to account for the extra border space*/}
          <canvas
            ref={canvasRef}
            width={CANVAS_DIMENSIONS.width - 6}
            height={CANVAS_DIMENSIONS.height}
            style={{
              border: "3px solid black",
              backgroundColor: "#1a202c",
            }}
          />
        </div>
      </div>
    </div>
  );
}
