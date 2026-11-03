import * as THREE from "three";
import { useMemo, useRef, useState, useLayoutEffect } from "react";
import { useMatches } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/accordion/accordion";
import Slider from "../../../components/simulationControls/Slider";
import SimulationControls from "../../../components/simulationControls/SimulationControls";



const NUM_POINTS = 700000;

interface SimConfig {
  threshold: number;
  speed: number;
  oneSProportion: number;
  twoPzProportion: number;
  pointSize: number;
  enableAxis: boolean;
  enableGrid: boolean;
}

type ParticleData = {
  positions: Float32Array;
  isActive: Float32Array;
  wavefunction1s: Float32Array;
  wavefunction2pz: Float32Array;
  wavefunction1sSquared: Float32Array;
  wavefunction2pzSquared: Float32Array;
};

function createParticleData(numPoints: number): ParticleData {
  const positions = new Float32Array(numPoints * 3);
  const isActive = new Float32Array(numPoints);
  const wavefunction1s = new Float32Array(numPoints);
  const wavefunction2pz = new Float32Array(numPoints);
  const wavefunction1sSquared = new Float32Array(numPoints);
  const wavefunction2pzSquared = new Float32Array(numPoints);

  for (let i = 0; i < numPoints; i++) {
    const x = (Math.random() - 0.5) * 20;
    const y = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;

    const distance = Math.sqrt(x * x + y * y + z * z);
    const theta = Math.atan2(Math.sqrt(x * x + z * z), y);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    isActive[i] = 0;

    const psi1s = Math.exp(-distance);
    const psi2pz = 0.6 * distance * Math.exp(-distance / 2) * Math.cos(theta);

    wavefunction1s[i] = psi1s;
    wavefunction2pz[i] = psi2pz;
    wavefunction1sSquared[i] = psi1s * psi1s;
    wavefunction2pzSquared[i] = psi2pz * psi2pz;
  }

  return {
    positions,
    isActive,
    wavefunction1s,
    wavefunction2pz,
    wavefunction1sSquared,
    wavefunction2pzSquared,
  };
}

function XYZAxes() {
  const axisRadius = 0.05;
  const axisLength = 10000;

  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 12]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>

      <mesh>
        <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 12]} />
        <meshBasicMaterial color={0x00ff00} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[axisRadius, axisRadius, axisLength, 12]} />
        <meshBasicMaterial color={0x0000ff} />
      </mesh>
    </group>
  );
}

function SceneGrid() {
  const grid = useMemo(() => {
    const g = new THREE.GridHelper(5000, 5000, 0x000000, 0x6f6f6f);
    const colors = g.geometry.attributes.color;

    for (let i = 0; i < colors.count; i++) {
      if (i < 4) {
        colors.setXYZ(i, 0, 0, 0);
      }
    }

    colors.needsUpdate = true;
    return g;
  }, []);

  return <primitive object={grid} />;
}

type CachedAttribs = {
  isActive: THREE.BufferAttribute;
  wf1s: THREE.BufferAttribute;
  wf2pz: THREE.BufferAttribute;
  wf1sS: THREE.BufferAttribute;
  wf2pzS: THREE.BufferAttribute;
};

type CachedArrays = {
  isActive: Float32Array;
  wf1s: Float32Array;
  wf2pz: Float32Array;
  wf1sS: Float32Array;
  wf2pzS: Float32Array;
};

function OrbitalPointCloud({ sim, particleData }: { sim: SimConfig; particleData: ParticleData }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const phaseRef = useRef(0);
  const simRef = useRef(sim);
  useLayoutEffect(() => {
    simRef.current = sim;
  });

  const attribRefs = useRef<CachedAttribs | null>(null);
  const arrayRefs = useRef<CachedArrays | null>(null);
  const numPointsRef = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();

    g.setAttribute("position", new THREE.BufferAttribute(particleData.positions, 3));
    g.setAttribute("isActive", new THREE.BufferAttribute(particleData.isActive, 1));
    g.setAttribute("wavefunction1s", new THREE.BufferAttribute(particleData.wavefunction1s, 1));
    g.setAttribute("wavefunction2pz", new THREE.BufferAttribute(particleData.wavefunction2pz, 1));
    g.setAttribute("wavefunction1sSquared", new THREE.BufferAttribute(particleData.wavefunction1sSquared, 1));
    g.setAttribute("wavefunction2pzSquared", new THREE.BufferAttribute(particleData.wavefunction2pzSquared, 1));

    return g;
  }, [particleData]);

  useLayoutEffect(() => {
    const isActive = geometry.getAttribute("isActive") as THREE.BufferAttribute;
    const wf1s = geometry.getAttribute("wavefunction1s") as THREE.BufferAttribute;
    const wf2pz = geometry.getAttribute("wavefunction2pz") as THREE.BufferAttribute;
    const wf1sS = geometry.getAttribute("wavefunction1sSquared") as THREE.BufferAttribute;
    const wf2pzS = geometry.getAttribute("wavefunction2pzSquared") as THREE.BufferAttribute;

    attribRefs.current = { isActive, wf1s, wf2pz, wf1sS, wf2pzS };

    arrayRefs.current = {
      isActive: isActive.array as Float32Array,
      wf1s: wf1s.array as Float32Array,
      wf2pz: wf2pz.array as Float32Array,
      wf1sS: wf1sS.array as Float32Array,
      wf2pzS: wf2pzS.array as Float32Array,
    };

    numPointsRef.current = particleData.isActive.length;
  }, [geometry, particleData]);

  const uniforms = useMemo(
    () => ({
      lightDirection: { value: new THREE.Vector3(0, 1, 0) },
      lightDirectionBelow: { value: new THREE.Vector3(0, -1, 0) },
      pointSize: { value: 6 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const s = simRef.current;
    const attribs = attribRefs.current;
    const arrays = arrayRefs.current;
    if (!attribs || !arrays) return;

    phaseRef.current = (phaseRef.current + delta * s.speed * 2.0) % (Math.PI * 2);

    const { isActive, wf1s, wf2pz, wf1sS, wf2pzS } = arrays;
    const numPoints = numPointsRef.current;
    const threshold = s.threshold / 10;
    const cosPhase = Math.cos(phaseRef.current);
    const oneS = s.oneSProportion;
    const twoPz = s.twoPzProportion;
    const interferenceFactor = oneS * twoPz * cosPhase;

    for (let i = 0; i < numPoints; i++) {
      const density = oneS * wf1sS[i] + twoPz * wf2pzS[i] + interferenceFactor * wf1s[i] * wf2pz[i];

      isActive[i] = density > threshold ? 1 : 0;
    }

    attribs.isActive.needsUpdate = true;

    if (materialRef.current) {
      materialRef.current.uniforms.pointSize.value = s.pointSize;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        attach="material"
        glslVersion={THREE.GLSL3}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`
        in float isActive;

        out float vIsActive;
        out float vLight;

        uniform vec3 lightDirection;
        uniform vec3 lightDirectionBelow;
        uniform float pointSize;

        void main() {
          vIsActive = isActive;

          vec3 normal = normalize(position);
          float lightAbove = max(dot(normal, normalize(lightDirection)), 0.0);
          float lightBelow = max(dot(normal, normalize(lightDirectionBelow)), 0.0);
          vLight = lightAbove + lightBelow * 0.6;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = pointSize;
        }
  `}
        fragmentShader={`
          in float vIsActive;
          in float vLight;

          out vec4 outColor;

          void main() {
            vec2 centered = gl_PointCoord * 2.0 - 1.0;

            if (dot(centered, centered) > 1.0) {
              discard;
            }

            if (vIsActive < 0.5) {
              discard;
            }

            float ambient = 0.5;
            vec3 baseColor = vec3(0.2, 0.8, 1.0);

            vec3 shadedColor = baseColor * (ambient + vLight * 0.7);
            outColor = vec4(shadedColor, 1.0);
          }
  `}
      />
    </points>
  );
}

function OrbitalScene({ sim, particleData }: { sim: SimConfig; particleData: ParticleData }) {
  return (
    <>
      {sim.enableGrid && <SceneGrid />}
      {sim.enableAxis && <XYZAxes />}
      <OrbitalPointCloud sim={sim} particleData={particleData} />
    </>
  );
}

const triggerClass =
  "relative w-full text-xl font-bold border-t-2 border-zinc-500 pl-4 pt-4 pb-2 hover:cursor-pointer hover:text-zinc-400 transition-colors duration-200";


type HydrogenSuperposition1s2pzSimulationProps = {
  onTaskComplete?: (taskId: string) => void;
};
  
export default function HydrogenSuperposition1s2pzSimulation({onTaskComplete}: HydrogenSuperposition1s2pzSimulationProps) {
  const matches = useMatches();
  const isFullscreen = matches.some((m) => (m.handle as { isFullscreen?: boolean })?.isFullscreen);

  const [threshold, setThreshold] = useState([0.5]);
  const [speed, setSpeed] = useState([1]);
  const [oneSProportion, setOneSProportion] = useState([0.5]);
  const [pointSize, setPointSize] = useState([6]);

  const [enableAxis, setEnableAxis] = useState(true);
  const [enableGrid, setEnableGrid] = useState(true);

  const [particleData] = useState<ParticleData>(() => createParticleData(NUM_POINTS));

  const twoPzProportion = [1 - oneSProportion[0]];

  const sim: SimConfig = {
    threshold: threshold[0],
    speed: speed[0],
    oneSProportion: oneSProportion[0],
    twoPzProportion: twoPzProportion[0],
    pointSize: pointSize[0],
    enableAxis,
    enableGrid,
  };

  const camera = {
    fov: 75,
    near: 0.1,
    far: 2000,
    position: [6, 3, 6] as [number, number, number],
  };

const handleProportionChange = (value: number[], slider: "1s" | "2pz") => {
  const proportion = value[0];
  setOneSProportion([slider === "1s" ? proportion : 1 - proportion]);

  if (proportion === 1) onTaskComplete?.(slider === "1s" ? "set1sProportion1" : "set2pzProportion1");
  if (proportion === 0.5) onTaskComplete?.("setEqualProportions");
  if (proportion === 0) onTaskComplete?.(slider === "1s" ? "set2pzProportion1" : "set1sProportion1");
};

const handleThresholdChange = (value: number[]) => {
  setThreshold(value);
  if (value[0] > 0.8) onTaskComplete?.("setProbabilityThreshold0.8");
  if (value[0] === 0.4) onTaskComplete?.("setProbabilityThreshold0.4");
};

  const controllableVariables = (
    <div className="scrollContainer max-h-[700px]">
      <Accordion allowMultiple={true}>
        <AccordionItem id="sim-settings">
          <AccordionTrigger className={triggerClass}>Simulation Settings</AccordionTrigger>
          <AccordionContent>
            <Slider
              key="threshold"
              value={threshold}
              onValueChange={handleThresholdChange}
              label="Probability Threshold"
              min={0.4}
              max={0.95}
              step={0.01}
            />

            <Slider
              key="speed"
              value={speed}
              onValueChange={setSpeed}
              label="Animation Speed"
              min={0}
              max={5}
              step={0.01}
            />

            <Slider
              key="one-s"
              value={[parseFloat(oneSProportion[0].toFixed(2))]}
              onValueChange={(value) => handleProportionChange(value, "1s")}
              label="1s Proportion"
              min={0}
              max={1}
              step={0.01}
            />

            <Slider
              key="two-pz"
              value={[parseFloat(twoPzProportion[0].toFixed(2))]}
              onValueChange={(value) => handleProportionChange(value, "2pz")}
              label="2pz Proportion"
              min={0}
              max={1}
              step={0.01}
            />

            <Slider
              key="point-size"
              value={pointSize}
              onValueChange={setPointSize}
              label="Point Size"
              min={1}
              max={12}
              step={0.25}
            />

            <div className="flex flex-col gap-2 mt-3 px-2">
              {(
                [
                  ["Enable XYZ Axis", enableAxis, setEnableAxis],
                  ["Enable XY Grid", enableGrid, setEnableGrid],
                ] as [string, boolean, (value: boolean) => void][]
              ).map(([label, value, setter]) => (
                <label key={label} className="flex justify-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setter(e.target.checked)}
                    className="accent-blue-500 w-4 h-4"
                  />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                className="mt-4 mb-2 px-3 py-1 text-sm bg-zinc-200 hover:bg-zinc-600 rounded transition-colors"
                onClick={() => {
                  setThreshold([0.5]);
                  setSpeed([1]);
                  setOneSProportion([0.5]);
                  setPointSize([6]);
                  setEnableAxis(true);
                  setEnableGrid(true);
                }}
              >
                Reset to Defaults
              </button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  return (
    <div className={isFullscreen ? "threeSimulationContainerFullscreen" : "threeSimulationContainer"}>
      <SimulationControls controllableSimulationVariables={controllableVariables} />
      <div className="threeCanvas">
        <Canvas camera={camera} scene={{ background: new THREE.Color(0x000000) }}>
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
          <OrbitalScene sim={sim} particleData={particleData} />
        </Canvas>
      </div>
    </div>
  );
}
