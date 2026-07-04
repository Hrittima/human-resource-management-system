/**
 * Generates an Employee ID in the format:
 * [First 2 letters of first name][First 2 letters of last name][YY][SSS]
 *
 * Example: "John Smith", joined 2026, 1st hire that year -> "JOSM26001"
 *
 * - Letters are always uppercased.
 * - If a name part is shorter than 2 letters, it's padded with "X".
 * - Serial number is the running count of employees onboarded in that
 *   calendar year, zero-padded to 3 digits (resets each year).
 */
export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  return { firstName: parts[0], lastName: parts[parts.length - 1] };
}

function twoLetters(chunk: string): string {
  const letters = chunk.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (letters.length >= 2) return letters.slice(0, 2);
  return (letters + "XX").slice(0, 2);
}

export function generateEmployeeId(
  fullName: string,
  joiningYear: number,
  serialNumber: number
): string {
  const { firstName, lastName } = splitFullName(fullName);
  const initials = `${twoLetters(firstName)}${twoLetters(lastName)}`;
  const yy = String(joiningYear).slice(-2);
  const serial = String(serialNumber).padStart(3, "0");
  return `${initials}${yy}${serial}`;
}
