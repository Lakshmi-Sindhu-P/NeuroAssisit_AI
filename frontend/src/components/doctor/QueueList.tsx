import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface QueueItem {
    consultation_id: string;
    patient_name: string;
    urgency_score: number;
    triage_category: string;
    wait_time_minutes: number;
    safety_warnings: any[];
}

export function QueueList({ onSelect, selectedId }: { onSelect: (id: string, name: string) => void, selectedId: string | null }) {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        try {
            const res = await api.get("/dashboard/queue");
            setQueue(res.data);
        } catch (err) {
            console.error("Failed to load queue", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const getUrgencyColor = (score: number) => {
        if (score >= 90) return "bg-red-600 hover:bg-red-700";
        if (score >= 70) return "bg-orange-500 hover:bg-orange-600";
        if (score >= 50) return "bg-yellow-500 hover:bg-yellow-600";
        return "bg-green-500 hover:bg-green-600";
    };

    const getWarningColor = (warnings: any[]) => {
        if (!warnings || warnings.length === 0) return "hidden";
        const hasCritical = warnings.some(w => w.type === "CONTRAINDICATION" || w.type === "CRITICAL");
        return hasCritical ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600";
    };

    if (loading) return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-10" />;

    return (
        <Card className="h-full flex flex-col border-none shadow-md">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="flex justify-between items-center text-lg">
                    <span>Patient Queue</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{queue.length} Waiting</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto flex-1 min-h-0 p-3 bg-muted/5">
                {queue.length === 0 ? (
                    <p className="text-muted-foreground text-center py-10">No patients waiting.</p>
                ) : (
                    queue.map((item) => (
                        <div
                            key={item.consultation_id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors bg-white shadow-sm"
                            onClick={() => onSelect(item.consultation_id, item.patient_name)}
                        >
                            <div>
                                <h3 className="font-semibold">{item.patient_name}</h3>
                                <div className="flex gap-2 text-xs mt-1">
                                    <Badge variant="secondary" className={getUrgencyColor(item.urgency_score) + " text-white border-0"}>
                                        Score: {item.urgency_score}
                                    </Badge>
                                    <span className="text-muted-foreground">Wait: {item.wait_time_minutes}m</span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                {item.safety_warnings && item.safety_warnings.length > 0 && (
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Badge className={`flex items-center gap-1 cursor-pointer text-white border-0 ${getWarningColor(item.safety_warnings)}`}>
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Warnings: {item.safety_warnings.length}
                                                </Badge>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-md p-4 bg-white border-red-200 text-foreground shadow-xl z-[9999]">
                                                <div className="space-y-3">
                                                    <p className="font-bold text-sm border-b pb-2 mb-2 text-red-600 flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4" /> Clinical Safety Alerts
                                                    </p>
                                                    {item.safety_warnings.map((w: any, idx: number) => (
                                                        <div key={idx} className="text-sm">
                                                            <div className="font-bold text-red-700 mb-1">
                                                                {w.type === "CONTRAINDICATION" ? "⛔ CONTRAINDICATION" : "⚠️ CAUTION"}
                                                            </div>
                                                            <div className="mb-1"><span className="font-semibold">Drug/Condition:</span> {w.drug || "N/A"}</div>
                                                            <div className="text-muted-foreground">{w.message}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground hover:text-primary">Start &rarr;</Button>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
