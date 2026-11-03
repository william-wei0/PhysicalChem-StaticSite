import { useOutletContext } from "react-router-dom";

export type LayoutContext = {
  isSidebarOpen: boolean;
  availableWidth: number;
};

const DEFAULT_LAYOUT_CONTEXT: LayoutContext = {
  isSidebarOpen: false,
  availableWidth: 1400 + 52, // roughly "large" available width, sidebar closed
};

export function useLayoutContext(): LayoutContext {
  const context = useOutletContext<LayoutContext | undefined>();
  return context ?? DEFAULT_LAYOUT_CONTEXT;
}