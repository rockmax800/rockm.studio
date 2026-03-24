// MBTI Type Data — Professional work-style descriptions only.
// No pseudoscience claims. Operational cognitive style indicators.

export interface MBTIType {
  code: string;
  label: string;
  shortDesc: string;
  strengths: string[];
  weaknesses: string[];
  collaborationStyle: string;
}

export const MBTI_TYPES: MBTIType[] = [
  {
    code: "INTJ", label: "INTJ — Architect",
    shortDesc: "Strategic, long-term planner. Strong structure, low tolerance for ambiguity.",
    strengths: ["Systems thinking", "Long-term planning", "Quality-focused"],
    weaknesses: ["May over-engineer", "Low flexibility under pressure"],
    collaborationStyle: "Prefers async, structured handoffs. Works best with clear specs.",
  },
  {
    code: "INTP", label: "INTP — Logician",
    shortDesc: "Analytical problem solver. Deep technical exploration, iterative approach.",
    strengths: ["Deep analysis", "Creative solutions", "Pattern recognition"],
    weaknesses: ["Can over-analyze", "May delay decisions"],
    collaborationStyle: "Independent worker. Thrives with open-ended technical challenges.",
  },
  {
    code: "ENTJ", label: "ENTJ — Commander",
    shortDesc: "Decisive leader. Fast execution, clear delegation, results-oriented.",
    strengths: ["Fast decisions", "Strong delegation", "Goal-oriented"],
    weaknesses: ["May rush quality", "Low patience for details"],
    collaborationStyle: "Direct communication. Drives team velocity.",
  },
  {
    code: "ENTP", label: "ENTP — Debater",
    shortDesc: "Innovative challenger. Questions assumptions, explores alternatives.",
    strengths: ["Innovation", "Challenge thinking", "Adaptable"],
    weaknesses: ["May lack follow-through", "Can over-pivot"],
    collaborationStyle: "Thrives in brainstorming. Good for architecture reviews.",
  },
  {
    code: "INFJ", label: "INFJ — Advocate",
    shortDesc: "Vision-driven. Focuses on user impact and long-term coherence.",
    strengths: ["User empathy", "Coherent vision", "Thorough documentation"],
    weaknesses: ["May over-idealize", "Slower under ambiguity"],
    collaborationStyle: "Thoughtful communicator. Excels at product-level decisions.",
  },
  {
    code: "INFP", label: "INFP — Mediator",
    shortDesc: "Values-driven. Strong focus on code quality and user experience.",
    strengths: ["Quality craftsmanship", "UX sensitivity", "Creative solutions"],
    weaknesses: ["May resist compromises", "Slower on deadlines"],
    collaborationStyle: "Works best with autonomy. Good for design-heavy tasks.",
  },
  {
    code: "ENFJ", label: "ENFJ — Protagonist",
    shortDesc: "Team-oriented leader. Strong at coordination and knowledge sharing.",
    strengths: ["Team coordination", "Mentoring", "Clear communication"],
    weaknesses: ["May over-commit", "Can deprioritize own tasks"],
    collaborationStyle: "Natural team lead. Good at handoff orchestration.",
  },
  {
    code: "ENFP", label: "ENFP — Campaigner",
    shortDesc: "Energetic innovator. Generates ideas, sees possibilities across domains.",
    strengths: ["Idea generation", "Cross-domain thinking", "Enthusiasm"],
    weaknesses: ["May lack focus", "Can start too many threads"],
    collaborationStyle: "High-energy collaborator. Best for ideation and prototyping.",
  },
  {
    code: "ISTJ", label: "ISTJ — Logistician",
    shortDesc: "Methodical executor. Follows processes, delivers consistently.",
    strengths: ["Consistency", "Process adherence", "Reliable output"],
    weaknesses: ["Low flexibility", "May resist novel approaches"],
    collaborationStyle: "Structured worker. Excels with clear SOPs and checklists.",
  },
  {
    code: "ISFJ", label: "ISFJ — Defender",
    shortDesc: "Detail-oriented supporter. Thorough testing, careful implementation.",
    strengths: ["Thorough testing", "Careful execution", "Documentation"],
    weaknesses: ["May be overly cautious", "Slow to adopt new tools"],
    collaborationStyle: "Supportive team member. Good for QA and review roles.",
  },
  {
    code: "ESTJ", label: "ESTJ — Executive",
    shortDesc: "Organized manager. Strong at process enforcement and delivery tracking.",
    strengths: ["Process enforcement", "Delivery tracking", "Clear standards"],
    weaknesses: ["May be rigid", "Low tolerance for experimentation"],
    collaborationStyle: "Direct manager style. Best for release coordination.",
  },
  {
    code: "ESFJ", label: "ESFJ — Consul",
    shortDesc: "Harmonious coordinator. Focused on team alignment and smooth delivery.",
    strengths: ["Team harmony", "Stakeholder communication", "Coordination"],
    weaknesses: ["May avoid necessary conflicts", "Can over-accommodate"],
    collaborationStyle: "Consensus builder. Good for cross-team coordination.",
  },
  {
    code: "ISTP", label: "ISTP — Virtuoso",
    shortDesc: "Pragmatic builder. Solves problems hands-on with minimal overhead.",
    strengths: ["Pragmatic solutions", "Fast debugging", "Efficient code"],
    weaknesses: ["May skip documentation", "Low process adherence"],
    collaborationStyle: "Independent executor. Best for implementation sprints.",
  },
  {
    code: "ISFP", label: "ISFP — Adventurer",
    shortDesc: "Aesthetic-focused creator. Strong visual sense, user-centric approach.",
    strengths: ["Visual design sense", "User-centric", "Creative execution"],
    weaknesses: ["May resist structure", "Can be unpredictable"],
    collaborationStyle: "Creative contributor. Excels in UI/UX implementation.",
  },
  {
    code: "ESTP", label: "ESTP — Entrepreneur",
    shortDesc: "Action-oriented problem solver. Fast iteration, high throughput.",
    strengths: ["Fast iteration", "High throughput", "Risk-tolerant"],
    weaknesses: ["May cut corners", "Low documentation priority"],
    collaborationStyle: "Fast-paced worker. Good for hotfixes and rapid prototyping.",
  },
  {
    code: "ESFP", label: "ESFP — Entertainer",
    shortDesc: "Engaging communicator. Brings energy to demos and client interactions.",
    strengths: ["Presentation skills", "Stakeholder engagement", "Adaptability"],
    weaknesses: ["May lack depth in analysis", "Can lose focus"],
    collaborationStyle: "Social contributor. Good for demos and client-facing tasks.",
  },
];

export function getMBTI(code: string): MBTIType | undefined {
  return MBTI_TYPES.find(m => m.code === code);
}
