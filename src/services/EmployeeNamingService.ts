// PART 2 — Employee Naming Service
// Deterministic human-style name generation for AI employees.
// Names are assigned on hire and never changed automatically.

const FIRST_NAMES = [
  "Alex", "Maya", "Daniel", "Sofia", "Leo",
  "Ava", "Noah", "Isla", "Kai", "Elena",
  "Ethan", "Mia", "Lucas", "Aria", "Liam",
  "Zara", "Owen", "Nina", "Ravi", "Hana",
  "Felix", "Luna", "Marco", "Yuki", "Sami",
  "Ivy", "Oscar", "Dani", "River", "Jade",
];

const LAST_NAMES = [
  "Mercer", "Chen", "Novak", "Alvarez", "Nakamura",
  "Singh", "Park", "Dubois", "Costa", "Berg",
  "Kim", "Torres", "Reeves", "Zhao", "Okafor",
  "Sato", "Müller", "Silva", "Petrov", "Larsen",
  "Wells", "Ortiz", "Tanaka", "Cho", "Nair",
  "Andersen", "Fischer", "Moreno", "Lee", "Grant",
];

// Seeded random for deterministic names given a seed string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a human-style name for an AI employee.
 * Uses role_code as seed for deterministic but unique-feeling names.
 * Pass an optional index for multiple employees with same role.
 */
export function generateEmployeeName(roleCode: string, index = 0): string {
  const seed = `${roleCode}-${index}`;
  const h = hashCode(seed);
  const firstName = FIRST_NAMES[h % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(h * 7 + index * 13) % LAST_NAMES.length];
  return `${firstName} ${lastName}`;
}

/**
 * Generate a unique name not already in the usedNames set.
 */
export function generateUniqueName(roleCode: string, usedNames: Set<string>): string {
  for (let i = 0; i < 100; i++) {
    const name = generateEmployeeName(roleCode, i);
    if (!usedNames.has(name)) return name;
  }
  // Fallback
  return `Agent-${roleCode}-${Date.now().toString(36)}`;
}
