import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface QueueItem {
    consultation_id: string;
    patient_name: string;
    urgency_score: number;
    triage_category: string;
    wait_time_minutes: number;
    safety_warnings: number;
}

export function QueueList({ onSelect, selectedId }: { onSelect: (id: string, name: string) => void, selectedId: string | null }) {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        try {
            const res = await api.get("/dashboard/queue");
            setQueue(res.data || []);
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

    if (loading) return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-10" />;

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex justify-between items-center text-lg">
                    <span>Patient Queue</span>
                    <Badge variant="outline">{queue.length} Waiting</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 overflow-y-auto max-h-[600px]">
                {queue.length === 0 ? (
                    <p className="text-muted-foreground text-center py-10 text-sm">No patients waiting.</p>
                ) : (
                    queue.map((item) => (
                        <div
                            key={item.consultation_id}
                            className={`flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors ${selectedId === item.consultation_id ? 'bg-accent border-primary/50' : ''}`}
                            onClick={() => onSelect(item.consultation_id, item.patient_name)}
                        >
                            <div className="min-w-0">
                                <h3 className="font-semibold text-sm truncate">{item.patient_name}</h3>
                                <div className="flex gap-2 text-[10px] mt-1">
                                    <Badge variant="secondary" className={getUrgencyColor(item.urgency_score) + " text-white border-0 py-0 h-4"}>
                                        {item.urgency_score}
                                    </Badge>
                                    <span className="text-muted-foreground">Wait: {item.wait_time_minutes}m</span>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                {item.safety_warnings > 0 && (
                                    <Badge variant="destructive" className="mb-1 block text-[8px] py-0 h-4">Warnings: {item.safety_warnings}</Badge>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 text-xs px-2">Start</Button>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
