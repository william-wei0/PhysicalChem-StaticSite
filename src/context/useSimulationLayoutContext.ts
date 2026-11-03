import { useOutletContext } from "react-router-dom";
import type { SimulationLayoutContext } from "../layouts/SimulationPageLayout";

const DEFAULT_CONTEXT: SimulationLayoutContext = {
  windowWidth: 1920,
  windowHeight: 911,
};

export function useSimulationLayoutContext(): SimulationLayoutContext {
  const context = useOutletContext<SimulationLayoutContext | undefined>();
  return context ?? DEFAULT_CONTEXT;
}