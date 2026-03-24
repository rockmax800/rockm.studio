// Nationality Data — Work culture traits only.
// Neutral, professional. No stereotypes. No political content.
// Focus on documented organizational culture research.

export interface NationalityOption {
  code: string;
  label: string;
  flag: string;
  workStyle: string;
}

export const NATIONALITIES: NationalityOption[] = [
  { code: "US", label: "United States", flag: "🇺🇸", workStyle: "Results-oriented, direct communication, fast iteration cycles." },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧", workStyle: "Structured processes, formal documentation, quality-focused." },
  { code: "DE", label: "Germany", flag: "🇩🇪", workStyle: "Engineering precision, thorough planning, process-driven." },
  { code: "JP", label: "Japan", flag: "🇯🇵", workStyle: "Consensus-driven, meticulous quality control, long-term planning." },
  { code: "KR", label: "South Korea", flag: "🇰🇷", workStyle: "Fast execution, high work intensity, technology-forward." },
  { code: "IL", label: "Israel", flag: "🇮🇱", workStyle: "Innovative, flat hierarchy, challenge-oriented thinking." },
  { code: "NL", label: "Netherlands", flag: "🇳🇱", workStyle: "Direct feedback culture, pragmatic, balanced work approach." },
  { code: "SE", label: "Sweden", flag: "🇸🇪", workStyle: "Collaborative decision-making, equality-focused, sustainable pace." },
  { code: "CH", label: "Switzerland", flag: "🇨🇭", workStyle: "Precision-oriented, neutral, high reliability standards." },
  { code: "SG", label: "Singapore", flag: "🇸🇬", workStyle: "Efficiency-focused, multicultural adaptability, merit-driven." },
  { code: "CA", label: "Canada", flag: "🇨🇦", workStyle: "Inclusive communication, balanced approach, risk-aware." },
  { code: "AU", label: "Australia", flag: "🇦🇺", workStyle: "Pragmatic, informal communication, outcome-focused." },
  { code: "IN", label: "India", flag: "🇮🇳", workStyle: "Adaptive, strong technical depth, scalable thinking." },
  { code: "BR", label: "Brazil", flag: "🇧🇷", workStyle: "Creative problem-solving, relationship-oriented, flexible." },
  { code: "FI", label: "Finland", flag: "🇫🇮", workStyle: "Autonomous worker, minimal hierarchy, trust-based." },
  { code: "EE", label: "Estonia", flag: "🇪🇪", workStyle: "Digital-native, lean processes, startup mindset." },
  { code: "FR", label: "France", flag: "🇫🇷", workStyle: "Analytical rigor, structured argumentation, design-conscious." },
  { code: "UA", label: "Ukraine", flag: "🇺🇦", workStyle: "Resilient, resourceful, strong engineering fundamentals." },
  { code: "PL", label: "Poland", flag: "🇵🇱", workStyle: "Reliable delivery, cost-conscious, solid technical skills." },
  { code: "PT", label: "Portugal", flag: "🇵🇹", workStyle: "Balanced work culture, collaborative, growing tech ecosystem." },
];

export function getNationality(code: string): NationalityOption | undefined {
  return NATIONALITIES.find(n => n.code === code);
}
