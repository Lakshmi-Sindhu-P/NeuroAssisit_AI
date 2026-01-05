import { useState } from "react";
import { QueueList } from "@/components/doctor/QueueList";
import { FailureQueue } from "@/components/doctor/FailureQueue";
import { ActiveConsultation } from "@/components/doctor/ActiveConsultation";
import { ConsultationHistory } from "@/components/doctor/ConsultationHistory";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AddPatientModal } from "@/components/doctor/AddPatientModal";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, UserPlus, Clock, LayoutDashboard } from "lucide-react";

export default function DoctorDashboard() {
    // State for selected patient from Queue
    const [selectedConsultation, setSelectedConsultation] = useState<string | null>(null);
    const [patientName, setPatientName] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'queue' | 'history'>('queue');

    const navigate = useNavigate();
    const { user } = useAuth();

    // Handler when clicking a patient in QueueList
    const handleSelectPatient = (id: string, name: string) => {
        setSelectedConsultation(id);
        setPatientName(name);
        setViewMode('queue'); // Ensure we switch back if selecting from somewhere else
    };

    // Handler when consultation is finished
    const handleConsultationComplete = () => {
        setSelectedConsultation(null);
        setPatientName(null);
        // Ideally, trigger a refresh of QueueList here
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    return (
        <div className="h-screen bg-background flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">N</div>
                    <h1 className="font-bold text-xl text-foreground">NeuroAssist <span className="text-muted-foreground font-normal">| Doctor Console</span></h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-muted p-1 rounded-md">
                        <Button
                            variant={viewMode === 'queue' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('queue')}
                            className="text-xs"
                        >
                            <LayoutDashboard className="w-4 h-4 mr-1" /> Active
                        </Button>
                        <Button
                            variant={viewMode === 'history' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('history')}
                            className="text-xs"
                        >
                            <Clock className="w-4 h-4 mr-1" /> History
                        </Button>
                    </div>

                    <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <UserPlus className="w-4 h-4 mr-2" /> Add Patient
                    </Button>
                    <span className="text-sm text-foreground">Dr. {user?.firstName || "Doctor"}</span>
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>

                <AddPatientModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        // Refresh queue if possible
                    }}
                    doctorId={user?.id || ""}
                />
            </header>

            {/* Main Layout */}
            <main className="flex-1 p-6 min-h-0 overflow-hidden">
                {viewMode === 'history' ? (
                    <div className="h-full overflow-hidden">
                        <ConsultationHistory />
                    </div>
                ) : (
                    <div className="grid grid-cols-12 gap-6 h-full">
                        {/* LEFT COLUMN: Queue Management */}
                        <div className="col-span-3 h-full overflow-hidden flex flex-col gap-2">
                            {/* 1. The Main Priority Queue - Takes all available space */}
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <QueueList onSelect={handleSelectPatient} selectedId={selectedConsultation} />
                            </div>

                            {/* 2. The Safety Valve (Manual Review) - Anchored at bottom */}
                            <div className="flex-shrink-0">
                                <FailureQueue onSelect={handleSelectPatient} />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Active Workspace */}
                        <div className="col-span-9 h-full overflow-y-auto">
                            <ActiveConsultation
                                consultationId={selectedConsultation}
                                patientName={patientName}
                                onComplete={handleConsultationComplete}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
