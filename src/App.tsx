import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Primary pages
import Index from "./pages/Index";
import DepartmentsPage from "./pages/Departments";
import DepartmentDetail from "./pages/DepartmentDetail";
import PresaleDetail from "./pages/PresaleDetail";
import IntakeComposer from "./pages/IntakeComposer";
import ProjectsPage from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import OfficePage from "./pages/control/OfficePage";
import TeamRoom from "./pages/TeamRoom";

// Management pages
import FounderPage from "./pages/FounderPage";
import CompanyPage from "./pages/CompanyPage";
import SystemPage from "./pages/SystemPage";

// Legacy / deep-link pages (preserved, not in nav)
import DocsWorkspace from "./pages/DocsWorkspace";
import TasksPage from "./pages/Tasks";
import ControlProjectDetail from "./pages/control/ControlProjectDetail";
import ControlTaskDetail from "./pages/control/ControlTaskDetail";
import ControlApprovalDetail from "./pages/control/ControlApprovalDetail";
import ControlRunDetail from "./pages/control/ControlRunDetail";
import ControlProviderDetail from "./pages/control/ControlProviderDetail";
import ClientPortal from "./pages/ClientPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* PRIMARY */}
          <Route path="/" element={<Index />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/departments/:slug" element={<DepartmentDetail />} />
          <Route path="/presale/new" element={<IntakeComposer />} />
          <Route path="/departments/:slug/presales/:id" element={<PresaleDetail />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/office" element={<OfficePage />} />

          {/* MANAGEMENT */}
          <Route path="/founder" element={<FounderPage />} />
          <Route path="/company" element={<CompanyPage />} />
          <Route path="/system" element={<SystemPage />} />

          {/* LEGACY DEEP LINKS (preserved for backward compat) */}
          <Route path="/docs" element={<DocsWorkspace />} />
          <Route path="/tasks" element={<Navigate to="/projects" replace />} />
          <Route path="/control/projects/:id" element={<ControlProjectDetail />} />
          <Route path="/control/tasks/:id" element={<ControlTaskDetail />} />
          <Route path="/control/approvals/:id" element={<ControlApprovalDetail />} />
          <Route path="/control/runs/:id" element={<ControlRunDetail />} />
          <Route path="/control/providers/:id" element={<ControlProviderDetail />} />

          {/* LEGACY REDIRECTS */}
          <Route path="/control" element={<Navigate to="/founder" replace />} />
          <Route path="/control/founder" element={<Navigate to="/founder" replace />} />
          <Route path="/control/office" element={<Navigate to="/office" replace />} />
          <Route path="/control/hr" element={<Navigate to="/company" replace />} />
          <Route path="/control/hiring-market" element={<Navigate to="/company" replace />} />
          <Route path="/control/blog" element={<Navigate to="/company" replace />} />
          <Route path="/control/providers" element={<Navigate to="/system" replace />} />
          <Route path="/providers" element={<Navigate to="/system" replace />} />
          <Route path="/runs" element={<Navigate to="/projects" replace />} />
          <Route path="/artifacts" element={<Navigate to="/projects" replace />} />
          <Route path="/reviews" element={<Navigate to="/projects" replace />} />
          <Route path="/approvals" element={<Navigate to="/founder" replace />} />
          <Route path="/agents" element={<Navigate to="/company" replace />} />
          <Route path="/settings" element={<Navigate to="/system" replace />} />

          {/* CLIENT PORTAL (standalone, no layout) */}
          <Route path="/client/:token" element={<ClientPortal />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
