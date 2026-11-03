import React from "react";
import styles from "./StartSimulationButton.module.css";
import clsx from "clsx";

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="1.5em"
      height="1.5em"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="1.5em"
      height="1.5em"
      aria-hidden="true"
    >
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

export default function StartSimulationButton({
  onClick,
  className,
  style,
  children,
  ariaPressed,
  ariaLabel,
}: {
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  ariaPressed?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className={clsx(styles.container, className)} style={style}>
      <button
        type="button"
        className={styles.button}
        onClick={onClick}
        aria-pressed={ariaPressed}
        aria-label={ariaLabel}
      >
        {ariaPressed ? <PauseIcon /> : <PlayIcon />}
        <span className={styles.label}>{children}</span>
      </button>
    </div>
  );
}