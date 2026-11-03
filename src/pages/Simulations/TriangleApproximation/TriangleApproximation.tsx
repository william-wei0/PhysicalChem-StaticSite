import "../styles/simulation.css";
import Slider from "../../../components/simulationControls/Slider";
import SimulationControls from "../../../components/simulationControls/SimulationControls";
import { useRef, useState, useEffect, useMemo } from "react";
import { useMatches } from "react-router-dom";
import { useLayoutContext } from "@/hooks/useLayoutContext";
import { useSimulationLayoutContext } from "../../../context/useSimulationLayoutContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/accordion/accordion";


type CanvasDimensions = {
  width: number;
  height: number;
};

type ControlAccordionProps = {
  id: string;
  title: string;
  triggerClassName?: string;
  content?: React.ReactNode;
};

type AnimationParams = {
  canvasDimensions: CanvasDimensions;
  wellWidth: number;
  wellBaseHeight: number;
  leftBoundary: number;
  rightBoundary: number;
  horizontalGridLines: number;
  tickMarks: number;
  waveColor: [number, number, number];
  waveApproximationColor: [number, number, number];
  waveThickness: number;
  isRainbow: boolean;
  isFilled: boolean;
  maxTerms: number;
  points: number;
};

function drawGridHorizontal(ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
  const { horizontalGridLines, leftBoundary, rightBoundary, wellBaseHeight } = animationParams;
  ctx.lineWidth = 1;

  for (let i = 0; i < horizontalGridLines; i++) {
    ctx.beginPath();
    ctx.moveTo(leftBoundary, (wellBaseHeight * i) / horizontalGridLines);
    ctx.lineTo(rightBoundary, (wellBaseHeight * i) / horizontalGridLines);
    ctx.strokeStyle = `rgba(200, 200, 200, 0.5)`;
    ctx.stroke();
  }

  ctx.lineWidth = 1.0;
}

function drawTickMarks(ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
  const { leftBoundary, wellWidth, tickMarks, wellBaseHeight } = animationParams;
  ctx.lineWidth = 2;

  for (let i = 1; i < tickMarks; i++) {
    const x = leftBoundary + (wellWidth * i) / tickMarks;
    ctx.beginPath();
    ctx.moveTo(x, wellBaseHeight - 8);
    ctx.lineTo(x, wellBaseHeight + 8);
    ctx.strokeStyle = `rgba(200, 200, 200, 1)`;
    ctx.stroke();
  }

  ctx.lineWidth = 1.0;
}

function drawFraction(
  ctx: CanvasRenderingContext2D,
  numerator: string,
  denominator: string,
  x: number,
  y: number,
  fontSize = 24,
) {
  // Set font style
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "center";

  // Measure text widths
  const numWidth = ctx.measureText(numerator).width;
  const denomWidth = ctx.measureText(denominator).width;

  // Use the widest part for fraction bar
  const barWidth = Math.max(numWidth, denomWidth) + 10;

  // Draw numerator
  ctx.fillText(numerator, x + barWidth / 2, y + fontSize);

  // Draw fraction bar
  ctx.beginPath();
  ctx.moveTo(x, y + fontSize + 5);
  ctx.lineTo(x + barWidth, y + fontSize + 5);
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw denominator
  ctx.fillText(denominator, x + barWidth / 2, y + fontSize * 2);
}

function draw_equation(ctx: CanvasRenderingContext2D, AnimationParams: AnimationParams, numTerms: number[]) {
  const { canvasDimensions, maxTerms } = AnimationParams;
  ctx.font = "24px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  const terms = [];
  const coeff = "";
  let num_terms_txt = numTerms[0];
  let ellipses = "";
  //c.fillText("y = x² + 3x + 2", canvas.width / 2, 40);
  if (numTerms[0] > maxTerms) {
    num_terms_txt = maxTerms;
    ellipses = " + ...";
  }

  for (let i = 0; i < num_terms_txt; i++) {
    const n = 2 * i + 1;
    const sign = i % 2 === 0 ? "" : "- ";
    const term = `${sign}${coeff}sin(${n == 1 ? "" : n}πx/${"L"})`;
    terms.push(term);
  }
  const seriesString = "y =       [" + terms.join(" + ").replace(/\+\s-\s/g, "- ") + "]" + ellipses;
  ctx.fillText(seriesString, canvasDimensions.width / 2, 100);

  const centerX = canvasDimensions.width / 2;
  const textWidth = ctx.measureText(seriesString).width;
  const startX = centerX - (textWidth - 80) / 2;
  drawFraction(ctx, "4L", "π²", startX, 70);
  ctx.fillText("Eigenfunction Approximation of a Triangle Function", canvasDimensions.width / 2, 65);
}

function draw_labels(ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
  const { canvasDimensions, wellBaseHeight, leftBoundary, wellWidth } = animationParams;
  ctx.font = "30px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText("Position (x)", canvasDimensions.width / 2, wellBaseHeight + 40);
  ctx.fillText("0", leftBoundary, wellBaseHeight + 40);
  ctx.fillText("L", leftBoundary + wellWidth, wellBaseHeight + 40);

  ctx.save();
  ctx.translate(leftBoundary - 25, wellBaseHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Probability Density |ψ|\u00B2", 0, 0);
  ctx.restore();
}

function draw_well(ctx: CanvasRenderingContext2D, animationParams: AnimationParams) {
  const { leftBoundary, wellBaseHeight, rightBoundary } = animationParams;
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(leftBoundary, 0);
  ctx.lineTo(leftBoundary, wellBaseHeight);
  ctx.lineTo(rightBoundary, wellBaseHeight);
  ctx.lineTo(rightBoundary, 0);

  ctx.strokeStyle = `rgba(200, 200, 200)`;
  ctx.stroke();
  ctx.lineWidth = 1.0;
}

function drawTriangle(ctx: CanvasRenderingContext2D, animationParams: AnimationParams, numTerms: number[]) {
  const { leftBoundary, wellWidth, wellBaseHeight, waveColor, waveApproximationColor, waveThickness, points } =
    animationParams;
  ctx.strokeStyle = `rgba(${waveColor[0]},${waveColor[1]},${waveColor[2]},${1.0})`;
  ctx.lineWidth = waveThickness;

  ctx.beginPath();
  ctx.moveTo(leftBoundary, wellBaseHeight);

  for (let i = 0; i < points / 2; i++) {
    const x = (i * wellWidth) / points + leftBoundary;
    const y = (wellBaseHeight * i) / points;

    ctx.lineTo(x, wellBaseHeight - y);
  }

  for (let i = points / 2; i < points; i++) {
    const x = (i * wellWidth) / points + leftBoundary;
    const y = wellBaseHeight * (1 - i / points);

    ctx.lineTo(x, wellBaseHeight - y);
  }

  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftBoundary, wellBaseHeight);
  for (let i = 0; i < points; i++) {
    const x = (i * wellWidth) / points + leftBoundary;
    let y = 0;

    let sign = 1;

    for (let j = 0; j < numTerms[0]; j++) {
      const n = 2 * j + 1;
      y += (sign * Math.sin((n * Math.PI * i) / points)) / (n * n);

      sign *= -1;
    }
    y *= (4 * wellBaseHeight) / (Math.PI * Math.PI);

    ctx.lineTo(x, wellBaseHeight - y);
  }

  ctx.strokeStyle = `rgba(${waveApproximationColor[0]}, ${waveApproximationColor[1]}, ${waveApproximationColor[2]}, ${1.0})`;
  ctx.stroke();
}

const LARGE_CANVAS: CanvasDimensions = { width: 1700, height: 800 };
const SMALL_CANVAS: CanvasDimensions = { width: 1400, height: 800 };

export default function TriangleApproximation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const WAVE_PERIOD = 1000000;
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

  const animationFrameRef = useRef<number>(0);
  const currentTime = useRef<number>(0);
  const startTime = useRef<number | null>(null);
  const elapsedTime = useRef<number>(0);

  const [numTerms, setNumTerms] = useState([4]);
  const [wellWidth, setWellWidth] = useState([(CANVAS_DIMENSIONS.width * 7) / 10]);
  const [wellBaseHeight, setWellBaseHeight] = useState([(CANVAS_DIMENSIONS.height * 8.5) / 10]);

  const animationParams = useMemo<AnimationParams>(
    () => ({
      canvasDimensions: CANVAS_DIMENSIONS,
      wellWidth: wellWidth[0],
      wellBaseHeight: wellBaseHeight[0],
      leftBoundary: (CANVAS_DIMENSIONS.width - wellWidth[0]) / 2.0,
      rightBoundary: (CANVAS_DIMENSIONS.width - wellWidth[0]) / 2.0 + wellWidth[0],
      horizontalGridLines: 6,
      tickMarks: 6,
      waveColor: [28, 90, 190],
      waveApproximationColor: [255, 165, 0],
      waveThickness: 5,
      isRainbow: false,
      isFilled: true,
      maxTerms: 9,
      points: 4500,
    }),
    [wellWidth, wellBaseHeight, CANVAS_DIMENSIONS],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = (timestamp: number) => {
      if (startTime.current === null) startTime.current = timestamp;

      elapsedTime.current = (elapsedTime.current + (timestamp - startTime.current)) % WAVE_PERIOD;
      currentTime.current = elapsedTime.current;
      startTime.current = timestamp;

      // Set background color and draw background
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, CANVAS_DIMENSIONS.width, CANVAS_DIMENSIONS.height);
      drawGridHorizontal(ctx, animationParams);

      drawTriangle(ctx, animationParams, numTerms);
      draw_well(ctx, animationParams);
      draw_labels(ctx, animationParams);
      drawTickMarks(ctx, animationParams);
      draw_equation(ctx, animationParams, numTerms);

      //drawFraction(ctx, "x+1", "y-2", 150, 30, 20);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [CANVAS_DIMENSIONS, animationParams, numTerms]);

  const accordionTriggerClassName =
    "relative w-full text-xl font-bold border-t-2 border-zinc-500 pl-4 pt-4 pb-2 hover:cursor-pointer hover:text-zinc-400 transition-colors duration-200";

  const WaveEigenstateSettings = useMemo<ControlAccordionProps[]>(() => {
    return [
      {
        id: "General Settings",
        title: "General Settings",
        triggerClassName: accordionTriggerClassName,
        content: (
          <>
            <Slider
              key="NumTerms"
              value={numTerms}
              onValueChange={setNumTerms}
              label="Number of Terms"
              min={1}
              max={animationParams.maxTerms}
              step={1}
            />
            <Slider
              key="Well Width"
              value={wellWidth}
              onValueChange={setWellWidth}
              label="Well Width"
              min={300}
              max={Math.round(CANVAS_DIMENSIONS.width * 0.9)}
              step={1}
            />
            <Slider
              key="Well Base Height"
              value={wellBaseHeight}
              onValueChange={setWellBaseHeight}
              label="Well Base Height"
              min={400}
              max={Math.round(CANVAS_DIMENSIONS.height * 0.9)}
              step={1}
            />
          </>
        ),
      },
    ];
  }, [numTerms, wellWidth, wellBaseHeight, animationParams.maxTerms, CANVAS_DIMENSIONS]);

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
              <Accordion key="accordion" allowMultiple={true}>
                {WaveEigenstateSettings.map((setting) => (
                  <AccordionItem id={setting.id} key={setting.id}>
                    <AccordionTrigger className={setting.triggerClassName}>{setting.title}</AccordionTrigger>
                    <AccordionContent>{setting.content}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          }
        />
        <div className="canvasScrollPane">
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
