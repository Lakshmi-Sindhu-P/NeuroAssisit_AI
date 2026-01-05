import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Phone, Calendar, Clock, FileText, Activity } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface PatientSidebarProps {
    patientId: string;
    currentConsultationId: string;
}

export function PatientSidebar({ patientId, currentConsultationId }: PatientSidebarProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [patient, setPatient] = useState<any>(null);

    useEffect(() => {
        if (!patientId) return;

        // Fetch History
        api.get(`/consultations/patient/${patientId}`)
            .then(res => {
                setHistory(res.data);
                // Extract patient profile from the first history item if available
                if (res.data.length > 0 && res.data[0].appointment?.patient?.patient_profile) {
                    setPatient(res.data[0].appointment.patient.patient_profile);
                }
            })
            .catch(console.error);
    }, [patientId]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "COMPLETED": return "bg-green-100 text-green-800";
            case "IN_PROGRESS": return "bg-blue-100 text-blue-800";
            case "FAILED": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    if (!patientId) return null;

    return (
        <div className="h-full flex flex-col gap-4 border-l pl-4 bg-muted/10">
            {/* Patient Context Card */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2 bg-muted/20">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" /> Patient Context
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 text-sm space-y-3">
                    {patient ? (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-xs text-muted-foreground block">Age/Gender</span>
                                    <span className="font-medium">
                                        {patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : "N/A"}
                                        yo / {patient.gender || "N/A"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">Phone</span>
                                    <span className="font-medium flex items-center gap-1">
                                        <Phone className="h-3 w-3" /> {patient.phone_number || "N/A"}
                                    </span>
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <span className="text-xs text-muted-foreground block mb-1">Medical History</span>
                                <div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100">
                                    {patient.medical_history || "No known history."}
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-muted-foreground italic">No profile data.</p>
                    )}
                </CardContent>
            </Card>

            {/* Visit History Timeline */}
            <Card className="flex-1 min-h-0 flex flex-col shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" /> Visit Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 pb-4">
                        <div className="space-y-4 pt-2">
                            {history.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">No prior visits.</p>
                            ) : (
                                history.map((visit) => (
                                    <div key={visit.id} className={`relative pl-4 border-l-2 ${visit.id === currentConsultationId ? 'border-primary' : 'border-muted'}`}>
                                        <div className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ${visit.id === currentConsultationId ? 'bg-primary' : 'bg-muted-foreground/30'}`} />

                                        <div className="mb-1 flex justify-between items-start">
                                            <span className="text-xs font-semibold">
                                                {format(new Date(visit.created_at), "MMM d, yyyy")}
                                            </span>
                                            <Badge variant="secondary" className={`text-[10px] px-1 py-0 h-4 ${getStatusColor(visit.status)}`}>
                                                {visit.status === "COMPLETED" ? "Signed" : visit.status}
                                            </Badge>
                                        </div>

                                        <div className="text-xs text-muted-foreground mb-1">
                                            {format(new Date(visit.created_at), "h:mm a")}
                                        </div>

                                        {visit.diagnosis && (
                                            <div className="bg-muted/30 p-2 rounded text-xs mt-1">
                                                <div className="flex items-start gap-1">
                                                    <FileText className="h-3 w-3 mt-0.5 text-primary" />
                                                    <span className="font-medium">{visit.diagnosis}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
