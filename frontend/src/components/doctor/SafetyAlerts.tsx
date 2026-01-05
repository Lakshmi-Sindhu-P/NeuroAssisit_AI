import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, AlertTriangle } from "lucide-react";

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
        <div className="space-y-3 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {warnings.map((w, i) => (
                <Alert
                    key={i}
                    variant={w.type === "CONTRAINDICATION" ? "destructive" : "default"}
                    className={w.type === "CONTRAINDICATION" ? "border-red-600 bg-red-50" : "border-yellow-500 bg-yellow-50"}
                >
                    {w.type === "CONTRAINDICATION" ? (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <AlertTitle className={w.type === "CONTRAINDICATION" ? "text-red-800" : "text-yellow-800"}>
                        {w.type === "CONTRAINDICATION" ? "Safety Alert (Critical)" : "Clinical Caution"}
                    </AlertTitle>
                    <AlertDescription className={w.type === "CONTRAINDICATION" ? "text-red-700" : "text-yellow-700"}>
                        {w.message}
                        {w.drug && (
                            <a
                                href={`https://www.drugs.com/search.php?searchterm=${w.drug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block mt-1 font-semibold underline text-xs hover:text-opacity-80"
                            >
                                Verify {w.drug} on Drugs.com &rarr;
                            </a>
                        )}
                    </AlertDescription>
                </Alert>
            ))}
        </div>
    );
}
