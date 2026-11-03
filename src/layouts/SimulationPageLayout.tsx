import { Outlet } from "react-router-dom";
import type { JSX } from "react";
import { useWindowSize } from "../hooks/useWindowSize";

export type SimulationLayoutContext = {
  windowWidth: number;
  windowHeight: number;
};

export default function SimulationPageLayout(): JSX.Element {
  const { width: windowWidth, height: windowHeight } = useWindowSize();

  return <Outlet context={{ windowWidth, windowHeight }} />;
}