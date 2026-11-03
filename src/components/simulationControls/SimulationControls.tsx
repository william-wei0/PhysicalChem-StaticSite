import { useState } from "react";
import OpenSimulationControlsButton from "../buttons/OpenSimulationControlsButton";
import CloseButtonHighlight from "../buttons/CloseButtonHighlight";

export default function SimulationControls({
  controllableSimulationVariables, onLeft = false
}: {
  controllableSimulationVariables: React.ReactNode;
  onLeft? : boolean
}) {
  const [isControlsPanelVisible, setisControlsPanelVisible] = useState(true);
  const handleClick = () => {
    setisControlsPanelVisible(!isControlsPanelVisible);
  };

  return (
    <>
      <div
        className={`absolute ${onLeft ? "left-3" : "right-3"} top-3 z-10 rounded-2xl overflow-clip bg-zinc-100 border border-black w-80 transition-all duration-500 ${
          onLeft ?
          isControlsPanelVisible
            ? "translate-x-0 opacity-100"
            : "-translate-x-[calc(100%+12px)] opacity-0"
        : isControlsPanelVisible
            ? "translate-x-0 opacity-100"
            : "translate-x-[calc(100%+12px)] opacity-0"}`}
      >
        <CloseButtonHighlight
          onClick={handleClick}
          className="right-1 top-3 z-10 absolute"
        />
        <h2 className="text-center font-bold mt-6 mb-2 text-[24px]">
          Simulation Controls
        </h2>
        {controllableSimulationVariables}
      </div>

      {!isControlsPanelVisible && (
        <OpenSimulationControlsButton
          onClick={handleClick}
          label="Controls"
          className={`absolute ${onLeft ? "left-3" : "right-3"} top-3 z-10`}
        />
      )}
    </>
  );
}
