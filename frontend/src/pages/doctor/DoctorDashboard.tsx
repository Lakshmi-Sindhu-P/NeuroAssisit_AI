import { useState } from "react";
import { QueueList } from "@/components/doctor/QueueList";
import { FailureQueue } from "@/components/doctor/FailureQueue";
import { useNavigate } from "react-router-dom";
import { AddPatientModal } from "@/components/doctor/AddPatientModal";
import { useAuth } from "@/contexts/AuthContext";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardOverview } from "@/components/doctor/DashboardWidgets";

export default function DoctorDashboard() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [queueCount, setQueueCount] = useState(0);
    const [avgWaitTime, setAvgWaitTime] = useState(0);

    const navigate = useNavigate();
    const { user } = useAuth();

    // Stats calculations
    const handleQueueUpdate = (count: number, avgWait: number) => {
        setQueueCount(count);
        setAvgWaitTime(avgWait);
    };

    // Navigate to the new Full Page Consultation
    const handleSelectPatient = (id: string) => {
        navigate(`/doctor/consultation/${id}`);
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex justify-between items-center flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
                    <p className="text-muted-foreground">Welcome back, Dr. {user?.firstName}.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsAddModalOpen(true)} className="shadow-sm">
                        <UserPlus className="w-4 h-4 mr-2" /> Quick Add Patient
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
                {/* LEFT COLUMN: Queue Management */}
                <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-4 overflow-hidden">
                    {/* 1. The Main Priority Queue */}
                    <div className="flex-1 min-h-0 overflow-hidden rounded-xl border bg-card shadow-sm">
                        <QueueList
                            onSelect={handleSelectPatient}
                            selectedId={null}
                            onQueueUpdate={handleQueueUpdate}
                        />
                    </div>

                    {/* 2. The Safety Valve */}
                    <div className="flex-shrink-0 rounded-xl border bg-card shadow-sm overflow-hidden max-h-[200px]">
                        <FailureQueue onSelect={handleSelectPatient} />
                    </div>
                </div>

                {/* RIGHT COLUMN: Widgets & Analytics */}
                <div className="col-span-12 lg:col-span-8 h-full overflow-y-auto">
                    <DashboardOverview queueLength={queueCount} avgWaitTime={avgWaitTime} />
                </div>
            </div>

            <AddPatientModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    // QueueList polls, so it will update eventually. 
                    // Could force refresh context if needed.
                }}
                doctorId={user?.id || ""}
            />
        </div>
    );
}
