import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface FailedItem {
    consultation_id: string;
    patient_name: string;
    reason: string;
    wait_time: string;
    status: string;
}

export function FailureQueue({ onSelect }: { onSelect: (id: string, name: string) => void }) {
    const [items, setItems] = useState<FailedItem[]>([]);
    const [error, setError] = useState(false);

    const fetchFailed = async () => {
        try {
            setError(false);
            const res = await api.get("/dashboard/queue/failed");
            setItems(res.data || []);
        } catch (err) {
            console.error(err);
            setError(true);
        }
    };

    useEffect(() => { fetchFailed(); }, []);

    const hasFailures = items.length > 0;

    if (error) {
        return (
            <Card className="mt-4 border border-red-200 bg-red-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-4 h-4" />
                        <span>System Error: Backend Unreachable</span>
                        <Button variant="ghost" size="icon" onClick={fetchFailed} className="h-6 w-6 ml-auto hover:bg-red-100">
                            <RefreshCw className="w-3 h-3" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xs text-red-600">Could not connect to server. Please check if backend is running.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`mt-4 border ${hasFailures ? "border-destructive/50 bg-destructive/10" : "border-green-200 bg-green-50"}`}>
            <CardHeader className="pb-2">
                <CardTitle className={`text-sm flex items-center gap-2 ${hasFailures ? "text-destructive" : "text-green-700"}`}>
                    {hasFailures ? <AlertTriangle className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    <span>{hasFailures ? `Manual Review Required (${items.length})` : "System Status: Healthy"}</span>
                    <Button variant="ghost" size="icon" onClick={fetchFailed} className="h-6 w-6 ml-auto hover:bg-white/50">
                        <RefreshCw className={`w-3 h-3 ${!hasFailures && "text-green-700"}`} />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!hasFailures ? (
                    <p className="text-xs text-green-600 font-medium">All AI processing pipelines are operational. No manual interventions needed.</p>
                ) : (
                    <div className="space-y-2">
                        {items.map(item => (
                            <div
                                key={item.consultation_id}
                                className="flex justify-between items-center bg-white p-2 rounded border border-red-100 text-sm cursor-pointer hover:bg-red-50 transition-colors"
                                onClick={() => onSelect(item.consultation_id, item.patient_name)}
                            >
                                <span>{item.patient_name}</span>
                                <Badge variant="destructive">Failed</Badge>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
