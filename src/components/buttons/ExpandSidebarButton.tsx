import type { CSSProperties } from "react";
import styles from "./styles/ExpandCollapseSidebarButtons.module.css";
import clsx from "clsx";

export default function ExpandSidebarButton({
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
      className={clsx(styles.sidebarButton, styles.right, className)}
      onClick={onClick}
      style={{
        ...style,
        '--arrow-size': "25px",
      } as CSSProperties}
      aria-label="Close"
    >
      <span className={clsx(styles.arrow, styles.right)}/>
    </button>
  );
}
