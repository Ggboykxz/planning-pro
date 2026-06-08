/**
 * Subject Color Coding System
 * Assigns consistent, deterministic colors to subjects based on their name hash.
 * Supports light and dark mode with distinct palettes.
 */

const SUBJECT_COLORS = [
  { bg: "#FEF3C7", text: "#92400E", dark: { bg: "#422006", text: "#FDE68A" } }, // Amber
  { bg: "#DBEAFE", text: "#1E40AF", dark: { bg: "#1E3A5F", text: "#93C5FD" } }, // Blue
  { bg: "#D1FAE5", text: "#065F46", dark: { bg: "#064E3B", text: "#6EE7B7" } }, // Green
  { bg: "#FCE7F3", text: "#9D174D", dark: { bg: "#500724", text: "#F9A8D4" } }, // Pink
  { bg: "#E0E7FF", text: "#3730A3", dark: { bg: "#312E81", text: "#A5B4FC" } }, // Indigo
  { bg: "#FEE2E2", text: "#991B1B", dark: { bg: "#450A0A", text: "#FCA5A5" } }, // Red
  { bg: "#CCFBF1", text: "#134E4A", dark: { bg: "#042F2E", text: "#5EEAD4" } }, // Teal
  { bg: "#FEF9C3", text: "#854D0E", dark: { bg: "#422006", text: "#FDE68A" } }, // Yellow
  { bg: "#F3E8FF", text: "#6B21A8", dark: { bg: "#3B0764", text: "#C4B5FD" } }, // Purple
  { bg: "#FFEDD5", text: "#9A3412", dark: { bg: "#431407", text: "#FDBA74" } }, // Orange
  { bg: "#E8F5E9", text: "#1B5E20", dark: { bg: "#1B3A1F", text: "#81C784" } }, // Green2
  { bg: "#FFF3E0", text: "#E65100", dark: { bg: "#3E2723", text: "#FFB74D" } }, // Orange2
  { bg: "#F1F8E9", text: "#33691E", dark: { bg: "#1A3313", text: "#AED581" } }, // Light Green
  { bg: "#E3F2FD", text: "#0D47A1", dark: { bg: "#0A2540", text: "#64B5F6" } }, // Blue2
  { bg: "#FCE4EC", text: "#880E4F", dark: { bg: "#4A0E2B", text: "#F48FB1" } }, // Pink2
  { bg: "#F0FDF4", text: "#166534", dark: { bg: "#052E16", text: "#86EFAC" } }, // Emerald
  { bg: "#ECFDF5", text: "#065F46", dark: { bg: "#022C22", text: "#6EE7B7" } }, // Mint
  { bg: "#FDF2F8", text: "#9D174D", dark: { bg: "#500724", text: "#FBCFE8" } }, // Rose
  { bg: "#EDE9FE", text: "#5B21B6", dark: { bg: "#2E1065", text: "#C4B5FD" } }, // Violet
  { bg: "#F5F3FF", text: "#4C1D95", dark: { bg: "#2E1065", text: "#DDD6FE" } }, // Purple2
  { bg: "#FFF7ED", text: "#9A3412", dark: { bg: "#431407", text: "#FED7AA" } }, // Orange3
  { bg: "#FEF2F2", text: "#991B1B", dark: { bg: "#450A0A", text: "#FECACA" } }, // Red2
  { bg: "#F0FDFA", text: "#134E4A", dark: { bg: "#042F2E", text: "#99F6E4" } }, // Teal2
  { bg: "#EFF6FF", text: "#1E40AF", dark: { bg: "#172554", text: "#BFDBFE" } }, // Sky
  { bg: "#FDF4FF", text: "#86198F", dark: { bg: "#4A044E", text: "#F0ABFC" } }, // Fuchsia
];

export interface SubjectColor {
  bg: string;
  text: string;
}

/**
 * Returns a consistent color for a given subject name.
 * Uses a hash of the name to deterministically pick from the palette.
 */
export function getSubjectColor(subjectName: string, isDark: boolean = false): SubjectColor {
  // Hash the subject name to get a consistent index
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = ((hash << 5) - hash) + subjectName.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % SUBJECT_COLORS.length;
  const color = SUBJECT_COLORS[index];
  if (isDark) return { bg: color.dark.bg, text: color.dark.text };
  return { bg: color.bg, text: color.text };
}

/**
 * Returns all subject colors (for legend rendering)
 */
export function getAllSubjectColors(): typeof SUBJECT_COLORS {
  return SUBJECT_COLORS;
}
