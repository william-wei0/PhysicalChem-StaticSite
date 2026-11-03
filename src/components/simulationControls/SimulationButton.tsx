import React from "react";
import styles from "./SimulationButton.module.css";
import clsx from "clsx";

export default function SimulationButton({
  onClick,
  className,
  style,
  children,
  ariaLabel,
}: {
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div className={clsx(styles.container, className)} style={style}>
      <button
        type="button"
        className={styles.button}
        onClick={onClick}
        aria-label={ariaLabel}>
        <span className={styles.label}>{children}</span>
      </button>
    </div>
  );
}