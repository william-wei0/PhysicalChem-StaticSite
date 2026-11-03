import type { CSSProperties } from "react";
import styles from "./styles/CloseButtonWithText.module.css";
import clsx from "clsx";

export default function CloseButtonWithText({
  onClick,
  className,
  style,
}: {
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      className={clsx(styles.CloseButtonWithText, className)}
      onClick={onClick}
      style={style}
    >
      <span className={styles.CloseButtonWithTextInner}>
        <span className={styles.CloseButtonWithTextLabel}>Close</span>
      </span>
    </button>
  );
}
