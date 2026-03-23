import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import ProjectsPage from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import TasksPage from "./pages/Tasks";
import DocsWorkspace from "./pages/DocsWorkspace";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import ProvidersPage from "./pages/Providers";
import NotFound from "./pages/NotFound";
import ControlOverview from "./pages/control/ControlOverview";
import ControlProjectDetail from "./pages/control/ControlProjectDetail";
import ControlTaskDetail from "./pages/control/ControlTaskDetail";
import ControlApprovalDetail from "./pages/control/ControlApprovalDetail";
import ControlRunDetail from "./pages/control/ControlRunDetail";
import ControlProviderList from "./pages/control/ControlProviderList";
import ControlProviderDetail from "./pages/control/ControlProviderDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/docs" element={<DocsWorkspace />} />
          <Route path="/runs" element={<PlaceholderPage title="Runs" description="No execution runs yet. Assign a task and start the first run." />} />
          <Route path="/artifacts" element={<PlaceholderPage title="Artifacts" description="No artifacts yet. Artifacts appear when tasks produce outputs." />} />
          <Route path="/reviews" element={<PlaceholderPage title="Reviews" description="No reviews yet. Submit an artifact for validation to begin." />} />
          <Route path="/approvals" element={<PlaceholderPage title="Approvals" description="No founder decisions waiting. Delivery is moving without blocked approval gates." />} />
          <Route path="/agents" element={<PlaceholderPage title="Agents" description="Agent registry will show roles, capabilities, and current workload." />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" description="System settings and configuration." />} />
          {/* Control Plane */}
          <Route path="/control" element={<ControlOverview />} />
          <Route path="/control/projects/:id" element={<ControlProjectDetail />} />
          <Route path="/control/tasks/:id" element={<ControlTaskDetail />} />
          <Route path="/control/approvals/:id" element={<ControlApprovalDetail />} />
          <Route path="/control/runs/:id" element={<ControlRunDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;