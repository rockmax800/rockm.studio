// System Decomposition — deterministic module extraction from scope
// Produces SystemModule[] and DependencyEdge[] for the planning package.
// All outputs are Intent Plane drafts — no Delivery state is created.

import type {
  SystemModule,
  DependencyEdge,
  RiskLevel,
  ComplexityEstimate,
} from "@/types/front-office-planning";

/** Known module templates keyed by scope keyword */
const MODULE_TEMPLATES: Record<string, Omit<SystemModule, "dependencies">> = {
  Authentication: {
    name: "Authentication",
    purpose: "User identity, session management, and access control",
    coreFeatures: ["Sign-up / sign-in", "Session tokens", "Password reset", "Role-based access"],
    riskLevel: "medium",
    complexityEstimate: "medium",
    mvpOptional: false,
  },
  Dashboard: {
    name: "Dashboard",
    purpose: "Primary user interface for data visualization and navigation",
    coreFeatures: ["Overview metrics", "Navigation shell", "Responsive layout"],
    riskLevel: "low",
    complexityEstimate: "medium",
    mvpOptional: false,
  },
  Payments: {
    name: "Payments",
    purpose: "Payment processing, subscriptions, and billing",
    coreFeatures: ["Checkout flow", "Payment gateway integration", "Invoice generation", "Subscription management"],
    riskLevel: "high",
    complexityEstimate: "large",
    mvpOptional: true,
  },
  "API Layer": {
    name: "API Layer",
    purpose: "Backend API endpoints for data operations",
    coreFeatures: ["REST/GraphQL endpoints", "Input validation", "Error handling", "Rate limiting"],
    riskLevel: "medium",
    complexityEstimate: "medium",
    mvpOptional: false,
  },
  "Real-time Chat": {
    name: "Real-time Chat",
    purpose: "Live messaging between users or support agents",
    coreFeatures: ["WebSocket connection", "Message persistence", "Typing indicators", "Read receipts"],
    riskLevel: "high",
    complexityEstimate: "large",
    mvpOptional: true,
  },
  Notifications: {
    name: "Notifications",
    purpose: "User notification delivery across channels",
    coreFeatures: ["In-app notifications", "Email notifications", "Notification preferences"],
    riskLevel: "low",
    complexityEstimate: "small",
    mvpOptional: true,
  },
  Reporting: {
    name: "Reporting",
    purpose: "Data aggregation and report generation",
    coreFeatures: ["Report templates", "Data export", "Scheduled reports"],
    riskLevel: "low",
    complexityEstimate: "medium",
    mvpOptional: true,
  },
  "Admin Panel": {
    name: "Admin Panel",
    purpose: "Administrative interface for system management",
    coreFeatures: ["User management", "System configuration", "Audit logs"],
    riskLevel: "medium",
    complexityEstimate: "medium",
    mvpOptional: true,
  },
  "Search Engine": {
    name: "Search Engine",
    purpose: "Full-text and structured search across application data",
    coreFeatures: ["Search indexing", "Filters and facets", "Relevance ranking"],
    riskLevel: "medium",
    complexityEstimate: "large",
    mvpOptional: true,
  },
  "File Management": {
    name: "File Management",
    purpose: "File upload, storage, and retrieval",
    coreFeatures: ["Upload interface", "Storage backend", "Access control", "Preview generation"],
    riskLevel: "medium",
    complexityEstimate: "medium",
    mvpOptional: true,
  },
  "Email System": {
    name: "Email System",
    purpose: "Transactional and marketing email delivery",
    coreFeatures: ["Email templates", "Delivery tracking", "Bounce handling"],
    riskLevel: "medium",
    complexityEstimate: "medium",
    mvpOptional: true,
  },
  Analytics: {
    name: "Analytics",
    purpose: "Usage tracking and business intelligence",
    coreFeatures: ["Event tracking", "Dashboard widgets", "Data visualization"],
    riskLevel: "low",
    complexityEstimate: "medium",
    mvpOptional: true,
  },
  "Third-party Integration": {
    name: "Third-party Integration",
    purpose: "External service connectors and data sync",
    coreFeatures: ["API adapters", "Webhook handling", "Data mapping"],
    riskLevel: "high",
    complexityEstimate: "medium",
    mvpOptional: true,
  },
  "Core Application": {
    name: "Core Application",
    purpose: "Primary application logic and data model",
    coreFeatures: ["Domain entities", "Business rules", "Data persistence"],
    riskLevel: "low",
    complexityEstimate: "medium",
    mvpOptional: false,
  },
};

/** Known dependency relationships */
const KNOWN_DEPENDENCIES: Array<{ from: string; to: string; reason: string }> = [
  { from: "Dashboard", to: "Authentication", reason: "Dashboard requires authenticated user context" },
  { from: "Dashboard", to: "API Layer", reason: "Dashboard fetches data through API" },
  { from: "Payments", to: "Authentication", reason: "Payment operations require user identity" },
  { from: "Payments", to: "API Layer", reason: "Payment processing through backend API" },
  { from: "Admin Panel", to: "Authentication", reason: "Admin access requires role-based auth" },
  { from: "Notifications", to: "Authentication", reason: "Notifications are user-scoped" },
  { from: "Real-time Chat", to: "Authentication", reason: "Chat requires user identity" },
  { from: "Reporting", to: "API Layer", reason: "Reports aggregate data from API" },
  { from: "Search Engine", to: "API Layer", reason: "Search indexes data from API layer" },
  { from: "File Management", to: "Authentication", reason: "File access requires permissions" },
  { from: "Analytics", to: "API Layer", reason: "Analytics collects data from API events" },
  { from: "Email System", to: "Authentication", reason: "Email delivery uses user contact data" },
];

/**
 * Generate system modules from extracted scope module names.
 * Deterministic — same input always produces same output.
 */
export function decomposeSystem(moduleNames: string[]): {
  modules: SystemModule[];
  dependencyGraph: DependencyEdge[];
} {
  const modules: SystemModule[] = moduleNames.map((name) => {
    const template = MODULE_TEMPLATES[name];
    if (template) {
      return {
        ...template,
        dependencies: [] as string[], // filled below
      };
    }
    // Unknown module — create minimal placeholder
    return {
      name,
      purpose: "Custom module — founder should define purpose",
      coreFeatures: ["To be specified"],
      dependencies: [],
      riskLevel: "medium" as RiskLevel,
      complexityEstimate: "medium" as ComplexityEstimate,
      mvpOptional: false,
    };
  });

  const moduleNameSet = new Set(moduleNames);

  // Build dependency edges only between modules that exist in the set
  const dependencyGraph: DependencyEdge[] = KNOWN_DEPENDENCIES.filter(
    (d) => moduleNameSet.has(d.from) && moduleNameSet.has(d.to)
  );

  // Populate module.dependencies from edges
  for (const mod of modules) {
    mod.dependencies = dependencyGraph
      .filter((e) => e.from === mod.name)
      .map((e) => e.to);
  }

  return { modules, dependencyGraph };
}

/** Create an empty module for founder to fill */
export function createEmptyModule(name: string): SystemModule {
  return {
    name,
    purpose: "",
    coreFeatures: [],
    dependencies: [],
    riskLevel: "low",
    complexityEstimate: "small",
    mvpOptional: false,
  };
}

/** Merge two modules into one */
export function mergeModules(a: SystemModule, b: SystemModule): SystemModule {
  return {
    name: `${a.name} + ${b.name}`,
    purpose: [a.purpose, b.purpose].filter(Boolean).join("; "),
    coreFeatures: [...new Set([...a.coreFeatures, ...b.coreFeatures])],
    dependencies: [...new Set([...a.dependencies, ...b.dependencies])].filter(
      (d) => d !== a.name && d !== b.name
    ),
    riskLevel: higherRisk(a.riskLevel, b.riskLevel),
    complexityEstimate: higherComplexity(a.complexityEstimate, b.complexityEstimate),
    mvpOptional: a.mvpOptional && b.mvpOptional,
  };
}

const RISK_ORDER: RiskLevel[] = ["low", "medium", "high", "critical"];
const COMPLEXITY_ORDER: ComplexityEstimate[] = ["trivial", "small", "medium", "large", "xlarge"];

function higherRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
}

function higherComplexity(a: ComplexityEstimate, b: ComplexityEstimate): ComplexityEstimate {
  return COMPLEXITY_ORDER.indexOf(a) >= COMPLEXITY_ORDER.indexOf(b) ? a : b;
}
