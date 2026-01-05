import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Upload, FileText, CheckCircle, Save } from "lucide-react";
import { SafetyAlerts } from "./SafetyAlerts";
import { toast } from "sonner";
import { PatientSidebar } from "./PatientSidebar";

interface ActiveConsultationProps {
    consultationId: string | null;
    patientName: string | null;
    onComplete: () => void;
}

export function ActiveConsultation({ consultationId, patientName, onComplete }: ActiveConsultationProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    // Clinical Data
    const [notes, setNotes] = useState("");
    const [diagnosis, setDiagnosis] = useState("");
    const [prescription, setPrescription] = useState("");
    const [safetyWarnings, setSafetyWarnings] = useState<any[]>([]);
    const [soapNote, setSoapNote] = useState<any>(null);
    const [aiStatus, setAiStatus] = useState<"idle" | "processing" | "ready">("idle");
    const [patientId, setPatientId] = useState<string | null>(null);
    const [patientDetails, setPatientDetails] = useState<any>(null); // To store age/gender specific for this view

    // Poll for updates when processing
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (aiStatus === "processing" && consultationId) {
            interval = setInterval(() => {
                api.get(`/consultations/${consultationId}`)
                    .then(res => {
                        const data = res.data;
                        // Update fields if they have changed and aren't being edited (simple sync)
                        if (data.status === "COMPLETED" || data.status === "FAILED") {
                            setAiStatus("ready"); // Stop polling
                            setNotes(data.notes || "");
                            setDiagnosis(data.diagnosis || "");
                            setPrescription(data.prescription || "");
                            setSafetyWarnings(data.safety_warnings || []);
                            setSoapNote(data.soap_note?.soap_json || null);

                            if (data.status === "FAILED") {
                                toast.error("AI processing reported issues. Please review manually.");
                            } else {
                                toast.success("AI Analysis Complete");
                            }
                        }
                    })
                    .catch(console.error);
            }, 3000);
        }

        return () => clearInterval(interval);
    }, [aiStatus, consultationId]);

    // Update fetch to get patient_id
    useEffect(() => {
        if (consultationId) {
            setLoading(true);
            api.get(`/consultations/${consultationId}`)
                .then(res => {
                    const data = res.data;
                    setNotes(data.notes || "");
                    setDiagnosis(data.diagnosis || "");
                    setPrescription(data.prescription || "");
                    setSafetyWarnings(data.safety_warnings || []);
                    setSoapNote(data.soap_note?.soap_json || null);
                    setPatientId(data.patient_id); // Access patient_id directly

                    // Access deep loaded profile if available (backend was updated)
                    if (data.appointment?.patient?.patient_profile) {
                        setPatientDetails(data.appointment.patient.patient_profile);
                    }

                    if (data.status === "IN_PROGRESS") setAiStatus("processing");
                    else setAiStatus("idle");
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            resetState();
        }
    }, [consultationId]);

    const resetState = () => {
        setNotes(""); setDiagnosis(""); setPrescription(""); setSafetyWarnings([]);
        setAiStatus("idle");
        setPatientId(null);
        setPatientDetails(null);
    }

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            await api.post(`/consultations/${consultationId}/upload`, formData);
            setAiStatus("processing");
            toast.success("Audio uploaded. AI processing started.");
        } catch (e: any) {
            console.error("Upload failed", e);
            const msg = e.response?.data?.detail || e.message || "Unknown error";
            toast.error(`Upload failed: ${msg}`);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (silent = false) => {
        try {
            await api.patch(`/consultations/${consultationId}`, {
                notes,
                diagnosis,
                prescription
            });
            if (!silent) toast.success("Clinical data saved.");
        } catch (e) {
            console.error("Save failed", e);
            if (!silent) toast.error("Failed to save data.");
        }
    };

    const handleComplete = async () => {
        await handleSave(true);
        // Mark as completed by setting end_time (simulated via status/notes mostly, but we trigger refresh)
        // Ideally we need an endpoint to "Finish". Using PATCH with a specific flag or implied?
        // Let's add 'is_finished' or just rely on the fact we saved.
        // WAIT: I need to update the backend to allow setting end_time.
        // For now, I will use a separate API call if needed, or update the logic.
        // Actually, let's assume the backend 'update_consultation' logic needs to be updated to accept a 'completed' flag.
        // But to unblock, I will just call onComplete() and let the UI refresh.
        // However, the queue ONLY filters by end_time == None. So I MUST set end_time.
        // I will update the backend to set end_time when a specific flag is sent or add a 'finish' endpoint.
        await api.patch(`/consultations/${consultationId}/finish`);
        toast.success("Consultation completed!");
        onComplete();
    };

    if (!consultationId) {
        return (
            <Card className="h-full flex items-center justify-center bg-muted/20 border-dashed">
                <div className="text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Select a patient from the queue to start consultation.</p>
                </div>
            </Card>
        );
    }

    return (
        <div key={consultationId} className="h-full flex flex-row gap-4 animate-in fade-in duration-300 slide-in-from-right-4">
            <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Top Section: Audio & Safety */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex justify-between items-center">
                                <span>{patientName}</span>
                                {aiStatus === "processing" && <span className="text-sm font-normal animate-pulse text-primary flex items-center">AI Processing...</span>}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 items-center">
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    />
                                </div>
                                <Button onClick={handleUpload} disabled={!file || uploading}>
                                    {uploading ? "Uploading..." : <><Upload className="w-4 h-4 mr-2" /> Process Audio</>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Safety Alerts Area */}
                    <div className="max-h-[140px] overflow-y-auto">
                        <SafetyAlerts warnings={safetyWarnings} />
                        {safetyWarnings.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg p-2 text-center">
                                <div className="flex items-center mb-1">
                                    <CheckCircle className="w-4 h-4 mr-2" /> No safety warnings.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                    <Card className="flex flex-col overflow-hidden">
                        <CardHeader className="py-3 bg-muted/5 border-b"><CardTitle>AI Analysis (SOAP)</CardTitle></CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-0">
                            <div className="p-4 text-sm leading-relaxed">
                                {aiStatus === "idle" ? <div className="text-muted-foreground text-center mt-10">Upload audio to generate notes.</div> :
                                    aiStatus === "processing" ? (
                                        <div className="flex flex-col items-center justify-center h-full space-y-4 mt-10">
                                            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            <p className="text-muted-foreground animate-pulse">Analyzing...</p>
                                        </div>
                                    ) : soapNote ? (
                                        <div className="space-y-6">
                                            <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100">
                                                <h3 className="font-semibold text-blue-700 mb-1 flex items-center gap-2">Subjective</h3>
                                                <p className="whitespace-pre-wrap text-blue-900">{soapNote.subjective}</p>
                                            </div>
                                            <div className="bg-green-50/50 p-3 rounded-md border border-green-100">
                                                <h3 className="font-semibold text-green-700 mb-1">Objective</h3>
                                                <p className="whitespace-pre-wrap text-green-900">{soapNote.objective}</p>
                                            </div>
                                            <div className="bg-amber-50/50 p-3 rounded-md border border-amber-100">
                                                <h3 className="font-semibold text-amber-700 mb-1">Assessment</h3>
                                                <p className="whitespace-pre-wrap text-amber-900">{soapNote.assessment}</p>
                                            </div>
                                            <div className="bg-purple-50/50 p-3 rounded-md border border-purple-100">
                                                <h3 className="font-semibold text-purple-700 mb-1">Plan</h3>
                                                <p className="whitespace-pre-wrap text-purple-900">{soapNote.plan}</p>
                                            </div>
                                        </div>
                                    ) : <div className="whitespace-pre-wrap">{notes}</div>
                                }
                            </div>
                        </CardContent>
                    </Card>

                    {/* Clinical Inputs */}
                    <Card className="flex flex-col">
                        <CardHeader className="py-3 flex flex-row justify-between items-center">
                            <CardTitle>Documentation</CardTitle>
                            <Button size="sm" variant="ghost" onClick={() => handleSave()}><Save className="w-4 h-4 mr-2" /> Draft</Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-3">
                            <div className="space-y-1"><Label>Diagnosis</Label><Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} /></div>
                            <div className="space-y-1"><Label>Prescription</Label><Textarea className="h-20 resize-none" value={prescription} onChange={e => setPrescription(e.target.value)} /></div>
                            <div className="space-y-1 flex-1"><Label>Notes</Label><Textarea className="h-24 resize-none" value={notes} onChange={e => setNotes(e.target.value)} /></div>
                        </CardContent>
                        <div className="p-3 border-t flex justify-between bg-muted/5 mt-auto">
                            <Button variant="ghost" size="sm" className="text-destructive">Flag</Button>
                            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="w-4 h-4 mr-2" /> Sign
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Right Sidebar: Patient History */}
            <div className="w-80 flex-shrink-0">
                {patientId && <PatientSidebar patientId={patientId} currentConsultationId={consultationId} />}
            </div>
        </div>
    );
}
