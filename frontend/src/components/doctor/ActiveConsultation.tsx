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

    // Fetch Data on Selection
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
                    if (data.status === "IN_PROGRESS") setAiStatus("processing");
                    else setAiStatus("idle");
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            // Reset
            setNotes(""); setDiagnosis(""); setPrescription(""); setSafetyWarnings([]);
            setAiStatus("idle");
        }
    }, [consultationId]);

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

    return (
        <div key={consultationId} className="space-y-4 h-full flex flex-col animate-in fade-in duration-300 slide-in-from-right-4">
            {/* Top Section: Audio & Safety */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between">
                            <span>Consulting: {patientName}</span>
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
                                <CheckCircle className="w-4 h-4 mr-2" /> No safety warnings detected.
                            </div>
                            {prescription && (
                                <a
                                    href={`https://www.drugs.com/search.php?searchterm=${prescription.split(" ")[0]}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs underline hover:text-green-800"
                                >
                                    Verify prescribing details on Drugs.com &rarr;
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Workspace */}
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                <Card className="flex flex-col">
                    <CardHeader className="py-3"><CardTitle>AI Analysis (SOAP)</CardTitle></CardHeader>
                    <CardContent className="flex-1 overflow-y-auto">
                        <div className="p-4 bg-muted h-full rounded-md text-sm leading-relaxed">
                            {aiStatus === "idle" ? "Upload audio to generate notes." :
                                aiStatus === "processing" ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        <p className="text-muted-foreground animate-pulse">Transcribing & Analyzing Consultation...</p>
                                    </div>
                                ) : (
                                    soapNote ? (
                                        <div className="space-y-6">
                                            <div>
                                                <h3 className="font-semibold text-primary mb-1">Subjective</h3>
                                                <p className="whitespace-pre-wrap">{soapNote.subjective || "No subjective data."}</p>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-primary mb-1">Objective</h3>
                                                <p className="whitespace-pre-wrap">{soapNote.objective || "No objective data."}</p>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-primary mb-1">Assessment</h3>
                                                <p className="whitespace-pre-wrap">{soapNote.assessment || "No assessment."}</p>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-primary mb-1">Plan</h3>
                                                <p className="whitespace-pre-wrap">{soapNote.plan || "No plan."}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap">{notes}</div>
                                    )
                                )
                            }
                        </div>
                    </CardContent>
                </Card>

                {/* Clinical Inputs */}
                <Card className="flex flex-col">
                    <CardHeader className="py-3 flex flex-row justify-between items-center">
                        <CardTitle>Clinical Documentation</CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => handleSave()}><Save className="w-4 h-4 mr-2" /> Save Draft</Button>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-4">
                        <div className="space-y-2">
                            <Label>Diagnosis (ICD-10 / Text)</Label>
                            <Input
                                placeholder="e.g. Migraine without aura (G43.0)"
                                value={diagnosis}
                                onChange={e => setDiagnosis(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Prescription</Label>
                            <Textarea
                                placeholder="e.g. Sumatriptan 50mg PO PRN"
                                className="h-24 resize-none"
                                value={prescription}
                                onChange={e => setPrescription(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2 flex-1">
                            <Label>Additional Notes</Label>
                            <Textarea
                                placeholder="Clinical observations..."
                                className="h-32 resize-none"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <div className="p-4 border-t flex justify-between items-center bg-muted/5 mt-auto">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                            <span className="sr-only">Delete</span>
                            {/* Maybe a clear form button? Or just Flag. User asked for Flag. */}
                            Flag for Review
                        </Button>
                        <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700 shadow-sm">
                            <CheckCircle className="w-4 h-4 mr-2" /> Complete & Sign
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
