import ErrorPage from "@/pages/ErrorPage";
import SimulationRouter from "../pages/Simulations/SimulationRouter";
import SimulationPageLayout from "@/layouts/SimulationPageLayout";

const routes = [
    {
    path: "/",
    errorElement: <ErrorPage />,
    children: [
      {
        element: <SimulationPageLayout />,
        children: [
          { index: true,                        element: <ErrorPage /> },
          { path: "simulations/:simulationId", element: <SimulationRouter />, handle: { isFullscreen: true }, },
        ],
      },
    ],
  },
]

export default routes;
