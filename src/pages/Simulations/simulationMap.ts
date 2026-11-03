import type { ComponentType } from "react";

import SingleSlitSimulationPage from "./SingleSlitSimulation/SingleSlitSimulationPage";
import WavefunctionSimulationPage from "./WaveFunctionSimulation/WavefunctionSimulationPage";
import WavefunctionSquaredSimulationPage from "./WaveFunctionSimulation/WavefunctionSquaredSimulationPage";
import TwoParticleWellSimulationPage from "./TwoParticleWellSimulation/TwoParticleWellSimulationPage";
import RigidRotorSimulationPage from "./RigidRotorSimulation/RigidRotorSimulationPage";
import HydrogenSuperposition1s2pzSimulationPage from "./HydrogenSuperposition1s2pzSimulation/HydrogenSuperposition1s2pzSimulationPage";
import HydrogenSuperposition1s2pSimulationPage from "./HydrogenSuperposition1s2pSimulation/HydrogenSuperposition1s2pSimulationPage";
import TriangleApproximationSimulationPage from "./TriangleApproximation/TriangleApproximationSimulationPage";

export const simulationMap: Record<string, ComponentType> = {
  singleslitsimulation: SingleSlitSimulationPage,
  wavefunctionsimulation: WavefunctionSimulationPage,
  wavefunctionsquaredsimulation: WavefunctionSquaredSimulationPage,
  quantumstatesimulation: TwoParticleWellSimulationPage,
  rigidrotor: RigidRotorSimulationPage,
  hydrogensuperposition1s2pz: HydrogenSuperposition1s2pzSimulationPage,
  hydrogensuperposition1s2p1: HydrogenSuperposition1s2pSimulationPage,
  triangleapproximation: TriangleApproximationSimulationPage,
};
