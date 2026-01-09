import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafetyWarning {
    type: "CONTRAINDICATION" | "CAUTION";
    message: string;
    drug: string;
    condition: string;
}

interface SafetyAlertsProps {
    warnings: SafetyWarning[];
}

export function SafetyAlerts({ warnings }: SafetyAlertsProps) {
    if (!warnings || warnings.length === 0) return null;

    return (
        <div className="space-y-4 mb-4 animate-in fade-in zoom-in duration-500">
            {warnings.map((w, i) => (
                <Alert
                    key={i}
                    className={cn(
                        "relative overflow-hidden border-none shadow-lg transition-all hover:scale-[1.01]",
                        w.type === "CONTRAINDICATION"
                            ? "bg-gradient-to-br from-red-50 to-white text-red-900 ring-1 ring-red-200"
                            : "bg-gradient-to-br from-amber-50 to-white text-amber-900 ring-1 ring-amber-200"
                    )}
                >
                    <div className={cn(
                        "absolute top-0 left-0 w-1 h-full",
                        w.type === "CONTRAINDICATION" ? "bg-red-500" : "bg-amber-500"
                    )} />

                    {w.type === "CONTRAINDICATION" ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                    )}

                    <AlertTitle className={cn(
                        "text-sm font-black uppercase tracking-widest mb-1",
                        w.type === "CONTRAINDICATION" ? "text-red-800" : "text-amber-800"
                    )}>
                        {w.type === "CONTRAINDICATION" ? "Critical Contraindication" : "Safety Caution"}
                    </AlertTitle>

                    <AlertDescription className="text-sm font-medium leading-relaxed">
                        {w.message}
                        {w.drug && (
                            <a
                                href={`https://www.drugs.com/search.php?searchterm=${w.drug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    "flex items-center gap-1.5 mt-2 font-bold underline text-xs transition-opacity hover:opacity-70",
                                    w.type === "CONTRAINDICATION" ? "text-red-700" : "text-amber-700"
                                )}
                            >
                                <ExternalLink className="h-3 w-3" />
                                Verify {w.drug} on Drugs.com
                            </a>
                        )}
                    </AlertDescription>
                </Alert>
            ))}
        </div>
    );
}
