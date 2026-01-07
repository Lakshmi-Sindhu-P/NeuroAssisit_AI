
import { ConsultationHistory } from "@/components/doctor/ConsultationHistory";

export default function ConsultationHistoryPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Consultation History</h1>
            <p className="text-muted-foreground">Review past consultations and finalized reports.</p>
            <div className="h-[calc(100vh-200px)]">
                <ConsultationHistory />
            </div>
        </div>
    );
}
