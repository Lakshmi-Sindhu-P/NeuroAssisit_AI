import { cn } from "@/lib/utils";

interface PriorityChipProps {
  triageCategory?: string; // CRITICAL, HIGH, MODERATE, LOW
  triageScore?: number;    // Fallback for legacy
  className?: string;
}

export function PriorityChip({ triageCategory, triageScore, className }: PriorityChipProps) {
  // Determine display based on triageCategory (preferred) or triageScore (legacy fallback)
  const getDisplayInfo = () => {
    // Use triageCategory if provided
    if (triageCategory) {
      switch (triageCategory.toUpperCase()) {
        case "CRITICAL":
          return {
            label: "Critical",
            colorClass: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-100 shadow-sm"
          };
        case "HIGH":
          return {
            label: "High",
            colorClass: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-100 shadow-sm"
          };
        case "MODERATE":
          return {
            label: "Moderate",
            colorClass: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-100 shadow-sm"
          };
        case "LOW":
        default:
          return {
            label: "Stable",
            colorClass: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-100 shadow-sm"
          };
      }
    }

    // Legacy fallback: use triageScore
    if (triageScore !== undefined) {
      if (triageScore >= 90) {
        return { label: "Critical", colorClass: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-100 shadow-sm" };
      } else if (triageScore >= 70) {
        return { label: "High", colorClass: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-100 shadow-sm" };
      } else if (triageScore >= 40) {
        return { label: "Moderate", colorClass: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-100 shadow-sm" };
      }
    }

    // Default
    return { label: "Stable", colorClass: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-100 shadow-sm" };
  };

  const { label, colorClass } = getDisplayInfo();

  return (
    <span
      className={cn(
        "inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
