import { useState } from "react";
import { QueueList } from "@/components/doctor/QueueList";
import { FailureQueue } from "@/components/doctor/FailureQueue";
import { ActiveConsultation } from "@/components/doctor/ActiveConsultation";
import { Button } from "@/components/ui/button";
import { AddPatientModal } from "@/components/doctor/AddPatientModal";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus } from "lucide-react";

export default function DoctorDashboard() {
    // State for selected patient from Queue
    const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
    const [patientName, setPatientName] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { user } = useAuth();

    // Handler when clicking a patient in QueueList
    const handleSelectPatient = (id: string, name: string) => {
        setSelectedConsultation(id);
        setPatientName(name);
    };

    // Handler when consultation is finished
    const handleConsultationComplete = () => {
        setSelectedConsultation(null);
        setPatientName(null);
        // Ideally, trigger a refresh of QueueList here
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Sub-header for dashboard specific actions */}
            <div className="flex justify-between items-center mb-6 px-1">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Clinical Queue</h2>
                    <p className="text-muted-foreground text-sm">Manage waiting patients and AI-assisted consultations.</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary/90 shadow-md">
                    <UserPlus className="w-4 h-4 mr-2" /> Add Patient
                </Button>
            </div>

            <AddPatientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    // In real app, we might trigger a refetch in QueueList
                    // For now, reload or wait for polling
                }}
                doctorId={user?.id || ""}
            />

            {/* Main Layout Grid */}
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">

                {/* LEFT COLUMN: Queue Management */}
                <div className="col-span-12 lg:col-span-3 h-full overflow-hidden flex flex-col gap-4">
                    {/* 1. The Main Priority Queue */}
                    <div className="flex-[2] min-h-0">
                        <QueueList onSelect={handleSelectPatient} selectedId={selectedConsultation} />
                    </div>

                    {/* 2. The Safety Valve (Manual Review) */}
                    <div className="flex-1 min-h-0">
                        <FailureQueue onSelect={handleSelectPatient} />
                    </div>
                </div>

                {/* RIGHT COLUMN: Active Workspace */}
                <div className="col-span-12 lg:col-span-9 h-full min-h-0">
                    <ActiveConsultation
                        consultationId={selectedConsultation}
                        patientName={patientName}
                        onComplete={handleConsultationComplete}
                    />
                </div>
            </div>
        </div>
    );
}
