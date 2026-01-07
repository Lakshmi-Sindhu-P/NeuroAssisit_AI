/**
 * Format a name to proper case (Title Case)
 * - Trims leading/trailing spaces
 * - Collapses multiple spaces into one
 * - Capitalizes first letter of each word
 * - Lowercases remaining letters
 * 
 * @example formatName("max maxine") -> "Max Maxine"
 * @example formatName(" abhinav   h ") -> "Abhinav H"
 * @example formatName("MAX mAXInE") -> "Max Maxine"
 */
export function formatName(name: string | null | undefined): string {
    if (!name) return "";

    return name
        .trim()
        .replace(/\s+/g, " ")  // Collapse multiple spaces
        .split(" ")
        .map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
}

/**
 * Format a doctor's name with "Dr." prefix
 * Uses formatName internally for proper casing
 */
export function formatDoctorName(firstName: string | null | undefined, lastName: string | null | undefined): string {
    const fullName = formatName(`${firstName || ""} ${lastName || ""}`.trim());
    return fullName ? `Dr. ${fullName}` : "Doctor";
}
