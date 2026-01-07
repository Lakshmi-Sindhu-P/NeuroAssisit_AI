import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Phone, Calendar, Clock, FileText, Activity, Play, File as FileIcon, Pill, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface PatientSidebarProps {
    patientId: string;
    currentConsultationId: string;
}

export function PatientSidebar({ patientId, currentConsultationId }: PatientSidebarProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [patient, setPatient] = useState<any>(null);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);

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

    const toggleExpand = (id: string) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

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
        <div className="h-full flex flex-col gap-4 border-l pl-4 bg-muted/10 h-[calc(100vh-200px)]">
            {/* Patient Context Card */}
            <Card className="shadow-sm shrink-0">
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

            {/* Visit History List */}
            <Card className="flex-1 min-h-0 flex flex-col shadow-sm overflow-hidden">
                <CardHeader className="pb-2 shrink-0">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" /> Past Consultations
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                    <ScrollArea className="h-full px-4 pb-4">
                        <div className="space-y-3 pt-2">
                            {history.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-4">No prior visits.</p>
                            ) : (
                                history.map((visit) => (
                                    <Collapsible
                                        key={visit.id}
                                        open={expandedIds.includes(visit.id)}
                                        onOpenChange={() => toggleExpand(visit.id)}
                                        className={`border rounded-md bg-card transition-all ${visit.id === currentConsultationId ? 'ring-2 ring-primary/20 border-primary' : 'hover:border-primary/50'}`}
                                    >
                                        <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleExpand(visit.id)}>
                                            <div className="flex items-center gap-3">
                                                <Badge variant="outline" className="w-16 justify-center flex-col h-12 gap-0 text-[10px] bg-muted/50">
                                                    <span className="font-bold text-sm">{format(new Date(visit.created_at), "dd")}</span>
                                                    <span className="uppercase">{format(new Date(visit.created_at), "MMM")}</span>
                                                </Badge>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-sm">{visit.diagnosis || "No Diagnosis"}</h4>
                                                        <Badge variant="secondary" className={`text-[10px] px-1 py-0 h-4 ${getStatusColor(visit.status)}`}>
                                                            {visit.status === "COMPLETED" ? "Signed" : visit.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <Clock className="w-3 h-3" /> {format(new Date(visit.created_at), "h:mm a")}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                {expandedIds.includes(visit.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </div>

                                        <CollapsibleContent>
                                            <div className="px-4 pb-4 space-y-4 pt-1 border-t bg-muted/5">

                                                {/* 1. Audio Recordings */}
                                                {visit.audio_files && visit.audio_files.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                            <Play className="w-3 h-3" /> Audio Recordings
                                                        </h5>
                                                        <div className="space-y-1">
                                                            {visit.audio_files.map((audio: any, idx: number) => (
                                                                <div key={idx} className="flex items-center gap-2 text-xs bg-background p-2 rounded border">
                                                                    <Play className="w-3 h-3 text-primary" />
                                                                    <div className="flex-1 truncate" title={audio.file_name}>
                                                                        {audio.file_name}
                                                                    </div>
                                                                    {/* Simple audio player or download link could go here */}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 2. Documents */}
                                                {visit.medical_documents && visit.medical_documents.length > 0 && (
                                                    <div className="space-y-2">
                                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                            <FileIcon className="w-3 h-3" /> Documents
                                                        </h5>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {visit.medical_documents.map((doc: any, idx: number) => (
                                                                <div key={idx} className="flex items-center gap-2 text-xs bg-background p-2 rounded border">
                                                                    <FileText className="w-3 h-3 text-blue-500" />
                                                                    <span className="truncate">{doc.file_name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 3. Prescription - if stored as text string in Consultation model */}
                                                {visit.prescription && (
                                                    <div className="space-y-2">
                                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                                            <Pill className="w-3 h-3" /> Prescription
                                                        </h5>
                                                        <div className="text-xs bg-background p-2 rounded border font-mono whitespace-pre-wrap">
                                                            {visit.prescription}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 4. Follow Up - Derived from Notes/Plan if unstructured */}
                                                {/* Placeholder for now as we don't have explicit field */}

                                                <div className="flex justify-end pt-2">
                                                    <Button variant="outline" size="sm" className="text-xs h-7">
                                                        View Full Details
                                                    </Button>
                                                </div>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
