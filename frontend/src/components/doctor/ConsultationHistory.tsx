import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function ConsultationHistory() {
    const [consultations, setConsultations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);

    useEffect(() => {
        api.get("/consultations/me")
            .then(res => setConsultations(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "COMPLETED": return "bg-green-100 text-green-800 hover:bg-green-100";
            case "IN_PROGRESS": return "bg-blue-100 text-blue-800 hover:bg-blue-100";
            case "FAILED": return "bg-red-100 text-red-800 hover:bg-red-100";
            default: return "bg-gray-100 text-gray-800 hover:bg-gray-100";
        }
    };

    if (loading) return <div className="p-4 text-center text-muted-foreground">Loading history...</div>;

    const soap = selectedConsultation?.soap_note?.soap_json;

    return (
        <>
            <Card className="h-full border-none shadow-none">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Consultation History
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                    <ScrollArea className="h-[calc(100vh-250px)]">
                        <div className="space-y-4">
                            {consultations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No consultations found.
                                </div>
                            ) : (
                                consultations.map((c) => {
                                    const patient = c.appointment?.patient?.patient_profile;
                                    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient";

                                    return (
                                        <div
                                            key={c.id}
                                            className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer"
                                            onClick={() => setSelectedConsultation(c)}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-semibold text-foreground">{patientName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(c.created_at), "PPP p")}
                                                </div>
                                                {c.diagnosis && (
                                                    <div className="flex items-start gap-2 text-sm mt-2">
                                                        <FileText className="w-3 h-3 mt-1 text-primary" />
                                                        <span className="font-medium">{c.diagnosis}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant="secondary" className={getStatusColor(c.status)}>
                                                    {c.status}
                                                </Badge>
                                                {c.status === "COMPLETED" && (
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Dialog open={!!selectedConsultation} onOpenChange={(open) => !open && setSelectedConsultation(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Consultation Details</DialogTitle>
                        <DialogDescription>
                            Date: {selectedConsultation && format(new Date(selectedConsultation.created_at), "PPP p")}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedConsultation && (
                        <div className="space-y-6">
                            {/* Clinical Summary */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                                <div>
                                    <h4 className="text-sm font-semibold mb-1">Diagnosis</h4>
                                    <p className="text-sm">{selectedConsultation.diagnosis || "N/A"}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold mb-1">Prescription</h4>
                                    <p className="text-sm">{selectedConsultation.prescription || "N/A"}</p>
                                </div>
                            </div>

                            {/* SOAP Note */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg border-b pb-2">AI Analysis (SOAP)</h3>
                                {soap ? (
                                    <div className="grid gap-4">
                                        <div className="bg-blue-50/50 p-3 rounded-md">
                                            <span className="font-bold text-blue-700 block mb-1">Subjective</span>
                                            <p className="text-sm whitespace-pre-wrap">{soap.subjective}</p>
                                        </div>
                                        <div className="bg-green-50/50 p-3 rounded-md">
                                            <span className="font-bold text-green-700 block mb-1">Objective</span>
                                            <p className="text-sm whitespace-pre-wrap">{soap.objective}</p>
                                        </div>
                                        <div className="bg-amber-50/50 p-3 rounded-md">
                                            <span className="font-bold text-amber-700 block mb-1">Assessment</span>
                                            <p className="text-sm whitespace-pre-wrap">{soap.assessment}</p>
                                        </div>
                                        <div className="bg-purple-50/50 p-3 rounded-md">
                                            <span className="font-bold text-purple-700 block mb-1">Plan</span>
                                            <p className="text-sm whitespace-pre-wrap">{soap.plan}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                        {selectedConsultation.notes || "No notes available."}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
