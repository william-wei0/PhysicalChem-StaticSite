import type { CSSProperties } from "react";
import styles from "./styles/closeButtonHighlight.module.css";
import clsx from "clsx";

export default function CloseButtonHighlight({
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
      className={clsx(styles.closeButtonHighlight, className)}
      onClick={onClick}
      style={style}
      aria-label="Close"
    ></button>
  );
}
