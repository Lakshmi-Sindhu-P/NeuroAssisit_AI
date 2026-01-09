import { useState } from "react";
import { ActiveConsultation } from "@/components/doctor/ActiveConsultation";
import { Button } from "@/components/ui/button";
import { AddPatientModal } from "@/components/doctor/AddPatientModal";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus, LayoutDashboard, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function DoctorDashboard() {
    // State for selected patient (derived from URL)
    const [searchParams] = useSearchParams();
    const consultationId = searchParams.get("consultationId");
    const patientNameParam = searchParams.get("patientName");

    // Derived state for ActiveConsultation
    // In a real app, ActiveConsultation might fetch details by ID. 
    // Here we pass props.

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { user } = useAuth();

    // Handler when consultation is finished
    const handleConsultationComplete = () => {
        // Navigate back to queue or clear selection
        // For now, keep it simple
    };

    if (!consultationId) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-500">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <LayoutDashboard className="h-12 w-12 text-primary" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Welcome, Dr. {user?.lastName}</h2>
                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                        Your clinical workspace is ready. Please select a patient from the queue to begin a consultation.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button asChild size="lg" className="shadow-lg hover:shadow-primary/20 transition-all">
                        <a href="/doctor/queue">
                            <Users className="w-5 h-5 mr-2" /> Go to Patient Queue
                        </a>
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setIsAddModalOpen(true)}>
                        <UserPlus className="w-5 h-5 mr-2" /> Add Patient Manually
                    </Button>
                </div>

                <AddPatientModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => { }}
                    doctorId={user?.id || ""}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Sub-header for dashboard specific actions */}
            <div className="flex justify-between items-center mb-6 px-1">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Active Consultation</h2>
                    <p className="text-muted-foreground text-sm">
                        Patient: <span className="font-semibold text-primary">{patientNameParam || "Unknown"}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <a href="/doctor/queue">Back to Queue</a>
                    </Button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 h-full min-h-0 bg-background/50 rounded-xl border border-border/50 overflow-hidden shadow-sm">
                <ActiveConsultation
                    consultationId={consultationId}
                    patientName={patientNameParam || null}
                    onComplete={handleConsultationComplete}
                />
            </div>
        </div>
    );
}
