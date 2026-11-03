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

type Eigenstate = {
  quantumNumber: number;
  proportion: number;
  sqrtProportion: number;
};

type AnimationParams = {
  canvasDimensions: CanvasDimensions;
  animationSpeed: number;
  waveAmplitude: number;
  wellWidth: number;
  wellBaseHeight: number;
  leftBoundary: number;
  rightBoundary: number;
  horizontalGridLines: number;
  tickMarks: number;
  waveColor: [number, number, number];
  waveThickness: number;
  isRainbow: boolean;
  isFilled: boolean;
};

type TwoEigenstateWellSimulationProps = {
  onTaskComplete?: (taskId: string) => void;
  hasBeenCompleted?: (taskId: string) => boolean;
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

function drawWave(
  ctx: CanvasRenderingContext2D,
  currentTime: number,
  animationParams: AnimationParams,
  eigenstate1: Eigenstate,
  eigenstate2: Eigenstate,
) {
  const { wellWidth, leftBoundary, isRainbow, isFilled, wellBaseHeight, animationSpeed, waveColor, waveThickness } =
    animationParams;
  const points = 4500;
  const SPEED_FACTOR = 0.0000009;

  ctx.strokeStyle = `rgba(${waveColor[0]},${waveColor[1]},${waveColor[2]},1.0)`;
  ctx.lineWidth = waveThickness;
  ctx.beginPath();
  ctx.moveTo(leftBoundary, wellBaseHeight);

  for (let i = 0; i < points; i++) {
    const x = (i * wellWidth) / points + leftBoundary;
    const y =
      animationParams.waveAmplitude *
      (eigenstate1.proportion * Math.sin((i / points) * eigenstate1.quantumNumber * Math.PI) ** 2 +
        eigenstate2.proportion * Math.sin((i / points) * eigenstate2.quantumNumber * Math.PI) ** 2 +
        eigenstate1.sqrtProportion *
          eigenstate2.sqrtProportion *
          Math.sin((i / points) * eigenstate1.quantumNumber * Math.PI) *
          Math.sin((i / points) * eigenstate2.quantumNumber * Math.PI) *
          Math.cos(
            Math.min(Math.abs(eigenstate2.quantumNumber ** 2 - eigenstate1.quantumNumber ** 2), 10) *
              currentTime *
              SPEED_FACTOR *
              animationSpeed,
          ));

    if (isRainbow) {
      const hue = ((y / animationParams.waveAmplitude / 1.8) * 360) % 360;
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
    }

    if (isFilled) {
      ctx.beginPath();
      ctx.moveTo(x, wellBaseHeight);
      ctx.lineTo(x, wellBaseHeight - y);
      ctx.stroke();
    } else {
      ctx.lineTo(x, wellBaseHeight - y);
    }
  }

  if (!isFilled) ctx.stroke();
}

function makeEigenstate(quantumNumber: number, proportion: number): Eigenstate {
  return { quantumNumber, proportion, sqrtProportion: Math.sqrt(proportion) };
}

const LARGE_CANVAS: CanvasDimensions = { width: 1700, height: 800 };
const SMALL_CANVAS: CanvasDimensions = { width: 1400, height: 800 };

export default function TwoEigenstateWellSimulation({
  onTaskComplete,
  hasBeenCompleted,
}: TwoEigenstateWellSimulationProps) {
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

  const [eigenstate1, setEigenstate1] = useState<Eigenstate>(() => makeEigenstate(1, 0.5));
  const [eigenstate2, setEigenstate2] = useState<Eigenstate>(() => makeEigenstate(2, 0.5));
  const [animationSpeed, setAnimationSpeed] = useState([0.5]);
  const [waveAmplitude, setWaveAmplitude] = useState([300]);
  const [wellWidth, setWellWidth] = useState([(CANVAS_DIMENSIONS.width * 0.8)]);
  const [wellBaseHeight, setWellBaseHeight] = useState([(CANVAS_DIMENSIONS.height * 0.85)]);

  const animationParams = useMemo<AnimationParams>(
    () => ({
      canvasDimensions: CANVAS_DIMENSIONS,
      animationSpeed: animationSpeed[0] * 2000,
      waveAmplitude: waveAmplitude[0],
      wellWidth: wellWidth[0],
      wellBaseHeight: wellBaseHeight[0],
      leftBoundary: (CANVAS_DIMENSIONS.width - wellWidth[0]) / 2.0,
      rightBoundary: (CANVAS_DIMENSIONS.width - wellWidth[0]) / 2.0 + wellWidth[0],
      horizontalGridLines: 6,
      tickMarks: 6,
      waveColor: [28, 90, 190],
      waveThickness: 5,
      isRainbow: false,
      isFilled: true,
    }),
    [animationSpeed, waveAmplitude, wellWidth, wellBaseHeight, CANVAS_DIMENSIONS],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = (timestamp: number) => {
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, CANVAS_DIMENSIONS.width, CANVAS_DIMENSIONS.height);

      if (startTime.current === null) startTime.current = timestamp;

      elapsedTime.current = (elapsedTime.current + (timestamp - startTime.current)) % WAVE_PERIOD;
      currentTime.current = elapsedTime.current;
      startTime.current = timestamp;

      draw_well(ctx, animationParams);
      drawGridHorizontal(ctx, animationParams);
      draw_labels(ctx, animationParams);
      drawWave(ctx, currentTime.current, animationParams, eigenstate1, eigenstate2);
      drawTickMarks(ctx, animationParams);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [CANVAS_DIMENSIONS, animationParams, eigenstate1, eigenstate2]);

  const accordionTriggerClassName =
    "relative w-full text-xl font-bold border-t-2 border-zinc-500 pl-4 pt-4 pb-2 hover:cursor-pointer hover:text-zinc-400 transition-colors duration-200";

  const WaveEigenstateSettings = useMemo<ControlAccordionProps[]>(() => {
    const handleProportionChange = (index: 1 | 2, proportion: number[]) => {
      const value = proportion[0];
      const otherValue = 1 - value;

      setEigenstate1((prev) => makeEigenstate(prev.quantumNumber, index === 1 ? value : otherValue));
      setEigenstate2((prev) => makeEigenstate(prev.quantumNumber, index === 2 ? value : otherValue));

      if (value === 1) onTaskComplete?.(index === 1 ? "setEigenstate1Proportion1" : "setEigenstate2Proportion1");
      if (value === 0.5) onTaskComplete?.("setEqualProportions");
      if (hasBeenCompleted?.("setBothEigenstateQuantumNumber3") && (value === 0 || value === 1)) {
        onTaskComplete?.("setBothEigenstateQuantumNumber3andProportion1");
      }
    };

    const handleQuantumNumberChange = (index: 1 | 2, energy: number[]) => {
      const n = energy[0];
      const [setThis, otherN] =
        index === 1 ? [setEigenstate1, eigenstate2.quantumNumber] : [setEigenstate2, eigenstate1.quantumNumber];

      setThis((prev) => makeEigenstate(n, prev.proportion));

      if (n === 3 && otherN === 2) onTaskComplete?.("setEigenstate1QuantumNumber3Eigenstate2QuantumNumber2");
      if (n === 2 && otherN === 3) onTaskComplete?.("setEigenstate1QuantumNumber3Eigenstate2QuantumNumber2");
      if (n === 3 && otherN === 3) onTaskComplete?.("setBothEigenstateQuantumNumber3");
      if (n === 2 && otherN === 1) onTaskComplete?.("setEigenstate1QuantumNumber2Eigenstate2QuantumNumber1");
      if (n === 1 && otherN === 2) onTaskComplete?.("setEigenstate1QuantumNumber2Eigenstate2QuantumNumber1");
      if (Math.abs(n - otherN) >= 5) onTaskComplete?.("setQuantumNumberDifferenceGreaterThan5");
    };

    return [1, 2]
      .map((index) => {
        const eigenstate = index === 1 ? eigenstate1 : eigenstate2;
        return {
          id: `Eigenstate ${index} Settings`,
          title: `Eigenstate ${index} Settings`,
          triggerClassName: accordionTriggerClassName,
          content: (
            <>
              <Slider
                key={`Energy Level ${index === 1 ? "(n)" : "(m)"}`}
                value={[eigenstate.quantumNumber]}
                onValueChange={(energy: number[]) => handleQuantumNumberChange(index as 1 | 2, energy)}
                label={`Energy Level ${index === 1 ? "(n)" : "(m)"}`}
                min={1}
                max={12}
              />
              <Slider
                key={`Proportion ${index}`}
                value={[parseFloat(eigenstate.proportion.toFixed(2))]}
                onValueChange={(p) => handleProportionChange(index as 1 | 2, p)}
                label={`Proportion ${index === 1 ? "(n)" : "(m)"}`}
                min={0}
                max={1}
                step={0.01}
              />
            </>
          ),
        };
      })
      .concat([
        {
          id: "General Settings",
          title: "General Settings",
          triggerClassName: accordionTriggerClassName,
          content: (
            <>
              <Slider
                key="Animation Speed"
                value={animationSpeed}
                onValueChange={setAnimationSpeed}
                label="Animation Speed"
                min={0}
                max={1}
                step={0.01}
              />
              <Slider
                key="Wave Amplitude"
                value={waveAmplitude}
                onValueChange={setWaveAmplitude}
                label="Wave Amplitude"
                min={1}
                max={500}
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
      ]);
  }, [
    eigenstate1,
    eigenstate2,
    animationSpeed,
    waveAmplitude,
    wellWidth,
    wellBaseHeight,
    onTaskComplete,
    hasBeenCompleted,
    CANVAS_DIMENSIONS,
  ]);

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
