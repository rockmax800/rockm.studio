import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";

// Primary pages
import Index from "./pages/Index";
import PresaleDetail from "./pages/PresaleDetail";
import IntakeComposer from "./pages/IntakeComposer";
import ProjectsPage from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import OfficePage from "./pages/control/OfficePage";
import TeamRoom from "./pages/TeamRoom";
import EmployeeProfile from "./pages/EmployeeProfile";
import TeamsPage from "./pages/TeamsPage";

// Management pages
import FounderPage from "./pages/FounderPage";
import SystemPage from "./pages/SystemPage";
import SMMCapability from "./pages/SMMCapability";
import CompanyLeadSession from "./pages/CompanyLeadSession";
import EvolutionDashboard from "./pages/EvolutionDashboard";

// Deep-link pages (preserved for backward compat)
import DocsWorkspace from "./pages/DocsWorkspace";
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
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/office" element={<OfficePage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/team-room" element={<TeamRoom />} />
          <Route path="/employees/:id" element={<EmployeeProfile />} />
          <Route path="/presale/new" element={<IntakeComposer />} />
          <Route path="/lead" element={<CompanyLeadSession />} />
          <Route path="/evolution" element={<EvolutionDashboard />} />
          <Route path="/smm" element={<SMMCapability />} />

          {/* MANAGEMENT */}
          <Route path="/founder" element={<FounderPage />} />
          <Route path="/system" element={<SystemPage />} />

          {/* DEEP LINKS (backward compat) */}
          <Route path="/docs" element={<DocsWorkspace />} />
          <Route path="/departments/:slug/presales/:id" element={<PresaleDetail />} />
          <Route path="/control/projects/:id" element={<ControlProjectDetail />} />
          <Route path="/control/tasks/:id" element={<ControlTaskDetail />} />
          <Route path="/control/approvals/:id" element={<ControlApprovalDetail />} />
          <Route path="/control/runs/:id" element={<ControlRunDetail />} />
          <Route path="/control/providers/:id" element={<ControlProviderDetail />} />

          {/* REDIRECTS — all legacy paths → canonical locations */}
          <Route path="/departments" element={<Navigate to="/teams" replace />} />
          <Route path="/departments/:slug" element={<Navigate to="/teams" replace />} />
          <Route path="/company" element={<Navigate to="/teams" replace />} />
          <Route path="/tasks" element={<Navigate to="/projects" replace />} />
          <Route path="/control" element={<Navigate to="/founder" replace />} />
          <Route path="/control/founder" element={<Navigate to="/founder" replace />} />
          <Route path="/control/office" element={<Navigate to="/office" replace />} />
          <Route path="/control/hr" element={<Navigate to="/teams" replace />} />
          <Route path="/control/hiring-market" element={<Navigate to="/teams" replace />} />
          <Route path="/control/blog" element={<Navigate to="/smm" replace />} />
          <Route path="/control/providers" element={<Navigate to="/system" replace />} />
          <Route path="/providers" element={<Navigate to="/system" replace />} />
          <Route path="/runs" element={<Navigate to="/projects" replace />} />
          <Route path="/artifacts" element={<Navigate to="/projects" replace />} />
          <Route path="/reviews" element={<Navigate to="/projects" replace />} />
          <Route path="/approvals" element={<Navigate to="/founder" replace />} />
          <Route path="/agents" element={<Navigate to="/teams" replace />} />
          <Route path="/settings" element={<Navigate to="/system" replace />} />

          {/* CLIENT PORTAL (standalone) */}
          <Route path="/client/:token" element={<ClientPortal />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
