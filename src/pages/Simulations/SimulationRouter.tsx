import { useParams } from "react-router-dom";
import type { JSX } from "react";
import { simulationMap } from "./simulationMap";

export default function SimulationRouter(): JSX.Element {
  const { simulationId } = useParams<{ simulationId: string }>();

  const Component = simulationId ? simulationMap[simulationId.toLowerCase()] : undefined;
  if (!Component) throw new Response("Simulation not found", { status: 404 });

  return <Component />;
}