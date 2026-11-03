import { useRef, useState, useEffect, useMemo } from "react";
import Slider from "../../../components/simulationControls/Slider";
import SimulationControls from "../../../components/simulationControls/SimulationControls";
import "../../styles/canvas.css";
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

type Particle = {
  energy: number;
  proportion: number;
  sqrt_proportion: number;
};

type AnimationParams = {
  animationSpeed: number[];
  waveAmplitude: number[];
  wellWidth: number[];
  wellBaseHeight: number[];
};

export default function Lesson1_Unit1_Simulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const BACKGROUND_COLOR = "rgba(26, 32, 44, 0.4)";
  const CANVAS_DIMENSIONS = useMemo<CanvasDimensions>(() => ({ width: 1400, height: 800 }), []);

  const animationFrameRef = useRef<number>(0);
  const currentTime = useRef<number>(0);
  const startTime = useRef<number | null>(null);
  const elapsedTime = useRef<number>(0);
  const previousTime = useRef<number | null>(null);

  const [particle1, setParticle1] = useState<Particle>({ energy: 1, proportion: 0.5, sqrt_proportion: 1 / Math.SQRT2 });
  const [particle2, setParticle2] = useState<Particle>({ energy: 1, proportion: 0.5, sqrt_proportion: 1 / Math.SQRT2 });
  const [animationSpeed, setAnimationSpeed] = useState([400]);
  const [waveAmplitude, setWaveAmplitude] = useState([300]);
  const [wellWidth, setWellWidth] = useState([(CANVAS_DIMENSIONS.width * 7) / 10]);
  const [wellBaseHeight, setWellBaseHeight] = useState([(CANVAS_DIMENSIONS.height * 8.5) / 10]);

  const animationParams = useMemo<AnimationParams>(
    () => ({
      animationSpeed,
      waveAmplitude,
      wellWidth,
      wellBaseHeight,
    }),
    [animationSpeed, waveAmplitude, wellWidth, wellBaseHeight],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = (timestamp: number) => {
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, CANVAS_DIMENSIONS.width, CANVAS_DIMENSIONS.height);

      const WAVE_PERIOD = 1000;

      if (startTime.current === null) {
        startTime.current = timestamp;
      }
      const time = (elapsedTime.current + (timestamp - startTime.current)) % WAVE_PERIOD;
      currentTime.current = time;

      if (startTime.current !== null) {
        elapsedTime.current = (elapsedTime.current + (timestamp - startTime.current)) % WAVE_PERIOD;
        startTime.current = null;
      }

      previousTime.current = timestamp;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [CANVAS_DIMENSIONS, animationParams]);

  const accordionTriggerClassName =
    "relative w-full text-xl font-bold border-t-2 border-zinc-500 pl-4 pt-4 pb-2 hover:cursor-pointer hover:text-zinc-400 transition-colors duration-200";

  const WaveParticleSettings = useMemo<ControlAccordionProps[]>(
    () => [
      {
        id: "General Settings",
        title: "General Settings",
        triggerClassName: accordionTriggerClassName,
        content: (
          <>
            <Slider
              key={"Animation Speed"}
              value={animationSpeed}
              onValueChange={setAnimationSpeed}
              label="Animation Speed"
              min={20}
              max={80}
              step={0.01}
            />
            <Slider
              key={"Wave Amplitude"}
              value={waveAmplitude}
              onValueChange={setWaveAmplitude}
              label="Wave Amplitude"
              min={20}
              max={80}
              step={0.01}
            />
            <Slider
              key={"Well Width"}
              value={wellWidth}
              onValueChange={setWellWidth}
              label="Well Width"
              min={20}
              max={80}
              step={0.01}
            />
            <Slider
              key={"Well Base Height"}
              value={wellBaseHeight}
              onValueChange={setWellBaseHeight}
              label="Well Base Height"
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
            <Slider
              key={"Particle 1 Energy"}
              value={[particle1.energy]}
              onValueChange={(energy: number[]) => {
                setParticle1((prev: Particle) => {
                  return { ...prev, energy: energy[0] };
                });
              }}
              label="Particle 1 Energy"
              min={1}
              max={12}
            />
            <Slider
              key={"Particle 2 Energy"}
              value={[particle2.energy]}
              onValueChange={(energy: number[]) => {
                setParticle2((prev: Particle) => {
                  return { ...prev, energy: energy[0] };
                });
              }}
              label="Particle 2 Energy"
              min={1}
              max={12}
            />
          </>
        ),
      },
    ],
    [particle1, particle2, animationSpeed, waveAmplitude, wellWidth, wellBaseHeight],
  );

  return (
    <div ref={containerRef} className="canvasContainer">
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
      <canvas
        ref={canvasRef}
        width={CANVAS_DIMENSIONS.width}
        height={CANVAS_DIMENSIONS.height}
        style={{
          border: "3px solid black",
          backgroundColor: "#1a202c",
        }}
      />
    </div>
  );
}
