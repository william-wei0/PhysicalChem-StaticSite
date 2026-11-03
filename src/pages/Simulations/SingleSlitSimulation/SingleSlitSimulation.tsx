import "../styles/simulation.css";
import Slider from "@/components/simulationControls/Slider";
import SimulationControls from "@/components/simulationControls/SimulationControls";
import StartSimulationButton from "@/components/simulationControls/StartSimulationButton";
import ResetButton from "@/components/simulationControls/SimulationButton";
import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useMatches } from "react-router-dom";
import { useLayoutContext } from "@/hooks/useLayoutContext";
import { useSimulationLayoutContext } from "../../../context/useSimulationLayoutContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/accordion/accordion";
import { Progress } from "@/components/ui/progress";
import {
  makeInitialRippleRenderer,
  makeRippleRenderer,
  drawDiffractionWall,
  drawReceptorWall,
  drawLightIntensityCurve,
  animateParticles,
  drawLightIntensityOnWall,
  drawLightIntensityGradient,
  type AnimationParams,
  type DiffractionWall,
  type ReceptorWall,
  type Particle,
  type ParticlesOnWall,
  type CanvasDimensions,
} from "./SingleSlitSimulationAnimations";


type ControlAccordionProps = {
  id: string;
  title: string;
  triggerClassName?: string;
  content?: React.ReactNode;
};

type Status = "hidden" | "in_progress" | "paused";
type ParticleStatus = Status | "completed" | "first_load" | "new";

type SingleSlitSimulationProps = {
  onTaskComplete?: (taskId: string) => void;
  hasBeenCompleted?: (taskId: string) => boolean;
};

const LARGE_CANVAS: CanvasDimensions = { width: 1700, height: 800 };
const SMALL_CANVAS: CanvasDimensions = { width: 1400, height: 800 };

export default function SingleSlitSimulation({ onTaskComplete, hasBeenCompleted }: SingleSlitSimulationProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const BACKGROUND_COLOR = "rgba(26, 32, 44, 0.4)";
  const SLIT_MAXIMUM = 60;
  const SLIT_MINIMUM = 250;
  const MAX_DELTA = 32;
  const HIDDEN_PARTICLE_COUNT = 200;
  const MAX_TRACKED = 100000;
  const { availableWidth } = useLayoutContext();
  const { windowWidth, windowHeight } = useSimulationLayoutContext();

  const matches = useMatches();
  const isFullscreen = matches.some((m) => (m.handle as { isFullscreen?: boolean })?.isFullscreen);
  const CANVAS_DIMENSIONS = useMemo<CanvasDimensions>(() => {
    if (isFullscreen) {
      return { width: windowWidth, height: windowHeight - 65 }; //account for the height of the top bar
    }
    return availableWidth > 1500 ? LARGE_CANVAS : SMALL_CANVAS;
  }, [isFullscreen, windowWidth, windowHeight, availableWidth]);

  const animationFrameRef = useRef<number>(0);
  const currentTime = useRef<number>(0);
  const startTime = useRef<number | null>(null);
  const elapsedTime = useRef<number>(0);
  const previousTime = useRef<number | null>(null);
  const lastUIUpdate = useRef(0);

  const [waveStatus, setWaveStatus] = useState<Status>("in_progress");
  const [particleStatus, setParticleStatus] = useState<ParticleStatus>("first_load");
  const [showLightGradient, setShowLightGradient] = useState(true);
  const [totalParticlesOnReceptorWall, setTotalParticlesHitReceptorWall] = useState(0);
  const [numOfParticlesToHitReceptorWall, setNumOfParticlesHitReceptorWall] = useState([2000]);
  const [wavelength, setWavelength] = useState([30]);
  const [waveSpeed, setSpeed] = useState([2.0]);
  const [particleSpeed, setParticleSpeed] = useState([0.5]);
  const [contrast, setContrast] = useState([1.0]);

  const initialPositionsRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  const [particleCount, _setParticleCount] = useState(1500);
  const [particleSize, _setParticleSize] = useState(5);

  const particlesOnWallRef = useRef<ParticlesOnWall>({
    particlePositions: Array(CANVAS_DIMENSIONS.height).fill(0),
    totalParticles: 0,
  });

  const [diffractionWall, setDiffractionWall] = useState<DiffractionWall>({
    x: CANVAS_DIMENSIONS.width * 0.2,
    slitSize: 150,
    wallWidth: 20,
    color: "rgba(255, 255, 255, 1)",
  });

  const [receptorWall, _setReceptorWall] = useState<ReceptorWall>({
    x: CANVAS_DIMENSIONS.width * 0.8,
    width: CANVAS_DIMENSIONS.width - CANVAS_DIMENSIONS.width * 0.8,
    color: "rgba(255, 255, 255, 1)",
  });

  const animationParams = useMemo<AnimationParams>(
    () => ({
      diffractionWall,
      receptorWall,
      canvasDimensions: CANVAS_DIMENSIONS,
      slitMinimum: SLIT_MAXIMUM,
      slitMaximum: SLIT_MINIMUM,
      contrast,
      wavelength,
      waveSpeed,
      lightColor: [0, 83, 250],
    }),
    [diffractionWall, receptorWall, CANVAS_DIMENSIONS, SLIT_MAXIMUM, SLIT_MINIMUM, contrast, wavelength, waveSpeed],
  );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const particles = [];
    const initialPositions = [];

    for (let i = 0; i < particleCount; i++) {
      const x = animationParams.diffractionWall.x * Math.random();
      const y = animationParams.canvasDimensions.height * Math.random();
      const vx = 5 * Math.random() + 2;

      initialPositions.push({ x, y, vx, vy: 0 });
      particles.push({ x, y, vx, vy: 0, size: particleSize, hue: 51, isActive: true });
    }

    for (let i = 0; i < HIDDEN_PARTICLE_COUNT; i++) {
      const x = animationParams.diffractionWall.x * Math.random();
      const y = animationParams.canvasDimensions.height * Math.random();
      const vx = 5 * Math.random() + 2;

      initialPositions.push({ x, y, vx, vy: 0 });
      particles.push({ x, y, vx, vy: 0, size: particleSize, hue: 51, isActive: false });
    }

    particlesRef.current = particles;
    initialPositionsRef.current = initialPositions;
  }, [animationParams, particleCount, particleSize]);

  const resetParticles = useCallback(() => {
    particlesRef.current.forEach((p, i) => {
      const init = initialPositionsRef.current[i];
      p.x = init.x;
      p.y = init.y;
      p.vx = init.vx;
      p.vy = init.vy;
    });
    particlesOnWallRef.current.particlePositions.fill(0);
    particlesOnWallRef.current.totalParticles = 0;
  }, []);

  const [canvasRenderedWidth, setCanvasRenderedWidth] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      setCanvasRenderedWidth(entry.contentRect.width);
    });

    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);

  const scale = canvasRenderedWidth / CANVAS_DIMENSIONS.width;

  useEffect(() => {
    resetParticles();
  }, [resetParticles, animationParams, particleCount, particleSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Render waves at 1/4 scale to improve performance
    const scaleFactor = 4;
    const drawCircularRipple = makeRippleRenderer(
      scaleFactor,
      animationParams.receptorWall.x - animationParams.diffractionWall.x,
      animationParams.canvasDimensions.height,
      animationParams.lightColor,
    );

    const drawInitialWaveRipple = makeInitialRippleRenderer(
      scaleFactor,
      animationParams.diffractionWall.x + animationParams.diffractionWall.wallWidth / 2,
      animationParams.canvasDimensions.height,
      animationParams.lightColor,
    );

    const animate = (timestamp: number) => {
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, animationParams.canvasDimensions.width, animationParams.canvasDimensions.height);

      const WAVE_PERIOD = 1000 / animationParams.waveSpeed[0];

      if (waveStatus === "in_progress") {
        if (startTime.current === null) {
          startTime.current = timestamp;
        }
        const time = (elapsedTime.current + (timestamp - startTime.current)) % WAVE_PERIOD;
        currentTime.current = time;
      } else {
        if (startTime.current !== null) {
          elapsedTime.current = (elapsedTime.current + (timestamp - startTime.current)) % WAVE_PERIOD;
          startTime.current = null;
        }
      }

      const deltaT = Math.min(previousTime.current !== null ? timestamp - previousTime.current : 0, MAX_DELTA);
      previousTime.current = particleStatus === "in_progress" ? timestamp : null;

      // Needed to update the progress in control panel since ref cannot be used during render
      if (timestamp - lastUIUpdate.current > 250) {
        setTotalParticlesHitReceptorWall(particlesOnWallRef.current.totalParticles);
        lastUIUpdate.current = timestamp;
      }

      if (waveStatus !== "hidden") {
        if (particleStatus === "hidden" || particleStatus === "first_load") {
          drawInitialWaveRipple(
            ctx,
            currentTime.current,
            0,
            0,
            (animationParams.wavelength[0] * 3) / 2,
            animationParams.waveSpeed[0],
            animationParams,
          );
        }

        drawCircularRipple(
          ctx,
          currentTime.current,
          animationParams.diffractionWall.x,
          0,
          animationParams.wavelength[0],
          animationParams.waveSpeed[0],
          animationParams,
        );
      }

      if (
        particleStatus === "in_progress" ||
        particleStatus === "paused" ||
        particleStatus === "new" ||
        particleStatus === "completed"
      ) {
        const yPositionOfParticlesOnWall = animateParticles(
          ctx,
          particlesRef.current,
          animationParams,
          deltaT,
          particleSpeed[0],
        );

        yPositionOfParticlesOnWall.forEach((index) => {
          if (particlesOnWallRef.current.totalParticles < MAX_TRACKED) {
            particlesOnWallRef.current.particlePositions[Math.round(index)] += 1;
            particlesOnWallRef.current.totalParticles += 1;
          }
          if (particlesOnWallRef.current.totalParticles === numOfParticlesToHitReceptorWall[0]) {
            setParticleStatus("completed");
            onTaskComplete?.("observeParticleMovement");
            if (waveStatus === "in_progress") {
              setWaveStatus("paused");
            }
          }
        });
      }

      drawDiffractionWall(ctx, animationParams);
      drawReceptorWall(ctx, animationParams);
      if (showLightGradient) drawLightIntensityGradient(ctx, animationParams);
      else {
        drawLightIntensityCurve(ctx, animationParams);
        drawLightIntensityOnWall(ctx, particlesOnWallRef.current, animationParams);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    waveStatus,
    particleStatus,
    showLightGradient,
    animationParams,
    particleSpeed,
    numOfParticlesToHitReceptorWall,
    onTaskComplete,
  ]);

  const accordionTriggerClassName =
    "relative w-full text-xl font-bold border-t-2 border-zinc-500 pl-4 pt-4 pb-2 hover:cursor-pointer hover:text-zinc-400 transition-colors duration-200";

  const buttonClassName =
    "px-4 py-2 text-xl font-medium transition-all duration-200 hover:cursor-pointer hover:bg-zinc-200 transition-colors duration-200";

  const buttonActiveClassName = "text-black bg-zinc-100";
  const buttonInactiveClassName = "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 hover:border-zinc-400";

  const clampedParticlesHitReceptorWall = Math.min(totalParticlesOnReceptorWall, numOfParticlesToHitReceptorWall[0]);
  const completionPercent = Math.round((clampedParticlesHitReceptorWall / numOfParticlesToHitReceptorWall[0]) * 100);
  const WaveParticleSettings = useMemo<ControlAccordionProps[]>(
    () => [
      {
        id: "General Settings",
        title: "General Settings",
        triggerClassName: accordionTriggerClassName,
        content: (
          <>
            <Slider
              key={"Diffraction"}
              value={[diffractionWall.slitSize]}
              onValueChange={(wallWidth: number[]) => {
                resetParticles();
                if (particleStatus !== "hidden" && particleStatus !== "first_load") {
                  setParticleStatus("new");
                }
                if (wallWidth[0] > diffractionWall.slitSize) {
                  onTaskComplete?.("observeIncreaseDiffractionSlitSizeChanges");
                } else {
                  onTaskComplete?.("observeDecreaseDiffractionSlitSizeChanges");
                }
                if (hasBeenCompleted?.("observeParticleMovement")) {
                  onTaskComplete?.("modifySlitSize");
                }
                setDiffractionWall((prev) => {
                  return { ...prev, slitSize: wallWidth[0] };
                });
              }}
              label="Diffraction Slit Size (nm)"
              min={SLIT_MAXIMUM}
              max={SLIT_MINIMUM}
            />
            <Slider
              key={"Wavelength"}
              value={wavelength}
              onValueChange={(newWavelength: number[]) => {
                resetParticles();
                if (particleStatus !== "hidden" && particleStatus !== "first_load") {
                  setParticleStatus("new");
                }

                if (newWavelength[0] > wavelength[0]) {
                  onTaskComplete?.("observeIncreaseWavelengthChanges");
                } else {
                  onTaskComplete?.("observeDecreaseWavelengthChanges");
                }
                setWavelength(newWavelength);

                return newWavelength;
              }}
              label="Wavelength"
              min={20}
              max={80}
              step={0.01}
            />
          </>
        ),
      },
      {
        id: "Wave Settings",
        title: "Wave Simulation Settings",
        triggerClassName: accordionTriggerClassName,
        content: (
          <>
            <StartSimulationButton
              className="mt-1 mb-2"
              onClick={() => {
                setWaveStatus((prev: Status) => {
                  if (prev === "in_progress") return "paused";
                  return "in_progress";
                });
              }}
              ariaPressed={waveStatus === "in_progress"}
            >
              {waveStatus === "in_progress"
                ? "Pause Wave Simulation"
                : waveStatus === "paused"
                  ? "Resume Wave Simulation"
                  : "Start Wave Simulation"}
            </StartSimulationButton>
            <Slider
              key={"Wave Speed"}
              value={waveSpeed}
              onValueChange={setSpeed}
              label="Wave Speed"
              min={0.1}
              max={4}
              step={0.01}
            />
            <Slider
              key={"Contrast"}
              value={contrast}
              onValueChange={setContrast}
              label="Contrast"
              min={0.1}
              max={2.5}
              step={0.01}
            />
          </>
        ),
      },
      {
        id: "Particle Settings",
        title: "Particle Simulation Settings",
        triggerClassName: accordionTriggerClassName,
        content: (
          <>
            <StartSimulationButton
              className="mt-1 mb-3"
              onClick={() => {
                setParticleStatus((prev: ParticleStatus) => {
                  if (prev === "in_progress") return "paused";
                  return "in_progress";
                });
                setShowLightGradient(false);
                onTaskComplete?.("startFirstParticleSimulation");
                if (hasBeenCompleted?.("modifySlitSize")) {
                  onTaskComplete?.("startSecondParticleSimulation");
                }
              }}
              ariaPressed={particleStatus === "in_progress"}
            >
              {particleStatus === "in_progress"
                ? "Pause Particle Simulation"
                : particleStatus === "paused" || particleStatus === "hidden"
                  ? "Resume Particle Simulation"
                  : particleStatus === "completed"
                    ? "Continue Simulation?"
                    : "Start Particle Simulation"}
            </StartSimulationButton>
            <ResetButton
              className="mb-3"
              onClick={() => {
                resetParticles();
                setParticleStatus("new");
              }}
            >
              Reset Simulation
            </ResetButton>
            <div className="px-4 space-y-2 mb-4 mt-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {particleStatus === "completed"
                      ? "Simulation Complete."
                      : particleStatus === "first_load" || particleStatus === "new"
                        ? "Waiting to Start Simulation..."
                        : completionPercent < 100
                          ? "Simulating Particles..."
                          : "Extending Simulation..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {clampedParticlesHitReceptorWall}/{numOfParticlesToHitReceptorWall[0]}
                  </p>
                </div>
                <span className="text-sm font-medium">{`${completionPercent}%`}</span>
              </div>
              <Progress value={completionPercent} />
            </div>
            <Slider
              key={"Number of Particles "}
              value={numOfParticlesToHitReceptorWall}
              onValueChange={setNumOfParticlesHitReceptorWall}
              label="Number of Particles To Simulate"
              min={100}
              max={20000}
              step={100}
              isActive={particleStatus !== "in_progress"}
            />
            <Slider
              key={"Particle Speed"}
              value={particleSpeed}
              onValueChange={setParticleSpeed}
              label="Particle Speed"
              min={0.1}
              max={1}
              step={0.01}
            />
          </>
        ),
      },
    ],
    [
      diffractionWall,
      wavelength,
      particleStatus,
      waveStatus,
      clampedParticlesHitReceptorWall,
      completionPercent,
      contrast,
      numOfParticlesToHitReceptorWall,
      particleSpeed,
      waveSpeed,
      resetParticles,
      onTaskComplete,
      hasBeenCompleted,
    ],
  );

  return (
    <div className="simulationCanvasLayout">
      <div className="flex flex-col">
        <div
          className="grid border-x-3 border-t-3 border-black bg-zinc-100 "
          style={{ gridTemplateColumns: `${receptorWall.x * scale}px 1fr` }}
        >
          <div className="flex border-black border-r-2">
            <button
              className={`${buttonClassName} border-black border-r-2
      ${waveStatus !== "hidden" ? buttonActiveClassName : buttonInactiveClassName}`}
              onClick={() => {
                setWaveStatus((prev) => (prev !== "hidden" ? "hidden" : "paused"));
              }}
            >
              {waveStatus !== "hidden" ? "Hide Wave Simulation" : "Show Wave Simulation"}
            </button>
            <button
              className={`${buttonClassName} border-black border-r-2
      ${
        particleStatus !== "hidden" && particleStatus !== "first_load" ? buttonActiveClassName : buttonInactiveClassName
      }`}
              onClick={() => {
                setParticleStatus((prev) => (prev !== "hidden" && prev !== "first_load" ? "hidden" : "paused"));
                onTaskComplete?.("showParticles");
              }}
            >
              {particleStatus !== "hidden" && particleStatus !== "first_load"
                ? "Hide Particle Simulation"
                : "Show Particle Simulation"}
            </button>
          </div>

          <button
            className={`${buttonClassName} buttonActiveClassName`}
            onClick={() => {
              setShowLightGradient((prev) => !prev);
              onTaskComplete?.("showParticleDistribution");
            }}
          >
            {showLightGradient ? (
              <div>
                <p className="">Light Wave Gradient</p>
                <p className="text-xs">Click to show expected light distribution</p>
              </div>
            ) : (
              <div>
                <p className="">Light Particle Distribution</p>
                <p className="text-xs">Click to show light gradient</p>
              </div>
            )}
          </button>
        </div>
        <div
          ref={containerRef}
          className="canvasContainer"
          style={{
            width: CANVAS_DIMENSIONS.width,
            height: CANVAS_DIMENSIONS.height,
            border: "3px solid black",
            boxSizing: "border-box",
          }}
        >
          <SimulationControls
            controllableSimulationVariables={
              <div className="scrollContainer max-h-[700px]">
                <Accordion key="accordion" allowMultiple={true}>
                  {WaveParticleSettings.map((setting) => (
                    <AccordionItem id={setting.id} key={setting.id}>
                      <AccordionTrigger className={setting.triggerClassName}>{setting.title}</AccordionTrigger>
                      <AccordionContent>{setting.content}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            }
            onLeft={true}
          />
          <div className="">
            {/*-6 to account for the extra border space*/}
            <canvas
              ref={canvasRef}
              width={CANVAS_DIMENSIONS.width}
              height={CANVAS_DIMENSIONS.height - 6}
              style={{
                backgroundColor: "#1a202c",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
