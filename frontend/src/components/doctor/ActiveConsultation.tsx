import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { TranscriptView } from "@/components/audio/TranscriptView";
import { PreConsultationBrief } from "./PreConsultationBrief";
import { SafetyAlerts } from "./SafetyAlerts";
import { toast } from "sonner";
import {
    FileText,
    BrainCircuit,
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    Stethoscope,
    AlertCircle,
    Save,
    Sparkles,
    Loader2,
    LayoutDashboard,
    Mic
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveConsultationProps {
    consultationId: string | null;
    patientName: string | null;
    onComplete: () => void;
}

// Refactored to 3 Steps
type Step = 1 | 2 | 3;

export function ActiveConsultation({ consultationId, patientName, onComplete }: ActiveConsultationProps) {
    const [loading, setLoading] = useState(false);
    const [consultation, setConsultation] = useState<any>(null);
    const [currentStep, setCurrentStep] = useState<Step>(1);

    // Intake Summary state
    const [intakeData, setIntakeData] = useState<{ summary: string; full_transcript: string } | null>(null);
    const [loadingIntake, setLoadingIntake] = useState(false);

    // Clinical Data
    const [notes, setNotes] = useState("");
    const [diagnosis, setDiagnosis] = useState("");
    const [prescription, setPrescription] = useState("");
    const [safetyWarnings, setSafetyWarnings] = useState<any[]>([]);

    // AI & Transcription State
    const [aiStatus, setAiStatus] = useState<"idle" | "processing" | "transcript_ready" | "soap_ready">("idle");
    const [transcriptionText, setTranscriptionText] = useState("");

    // Poll for AI updates
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (aiStatus === "processing" && consultationId) {
            interval = setInterval(() => fetchConsultation(true), 3000);
        }
        return () => clearInterval(interval);
    }, [aiStatus, consultationId]);

    // Fetch Data on Selection
    useEffect(() => {
        if (consultationId) {
            setCurrentStep(1); // Reset to step 1
            fetchConsultation();
            fetchIntakeSummary();
        } else {
            resetState();
        }
    }, [consultationId]);

    const resetState = () => {
        setConsultation(null);
        setNotes(""); setDiagnosis(""); setPrescription(""); setSafetyWarnings([]);
        setAiStatus("idle");
        setIntakeData(null);
        setTranscriptionText("");
    };

    const fetchConsultation = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get(`/consultations/${consultationId}`);
            const data = res.data;
            setConsultation(data);
            setNotes(data.notes || "");
            setDiagnosis(data.diagnosis || "");
            setPrescription(data.prescription || "");
            setSafetyWarnings(data.safety_warnings || []);

            // Update Transcription if available
            const consultAudio = data.audio_files?.find((f: any) => f.file_type === "CONSULTATION");
            if (consultAudio && consultAudio.transcription) {
                // Only update if we aren't actively editing (could add check here, but simple for now)
                // If distinct from current, update? For now, sync.
                if (!transcriptionText) setTranscriptionText(consultAudio.transcription);
            }

            // Check AI Status
            if (data.status === "FAILED") {
                setAiStatus("idle");
                if (!silent) toast.error("AI Analysis failed. Please review manually.");
            } else if (data.soap_note) {
                setAiStatus("soap_ready");
            } else if (data.status === "IN_PROGRESS") {
                if (consultAudio?.transcription) {
                    setAiStatus("transcript_ready");
                } else {
                    setAiStatus("processing");
                }
            } else {
                setAiStatus("idle");
            }

            // --- SMART RESUME LOGIC ---
            // If this is the initial load (not silent poll) and we are on Step 1,
            // check if we should auto-jump to where we left off.
            if (!silent && currentStep === 1) {
                // Modified Logical Flow:
                // Only auto-advance to Step 2 if we are actively IN_PROGRESS or have audio content to show.
                // We do NOT auto-jump to Step 3 (Clinical Plan) to ensure the doctor reviews the transcript first.
                if (data.status === "IN_PROGRESS" || (consultAudio && !data.soap_note)) {
                    setCurrentStep(2);
                }
            }
        } catch (e) {
            console.error("Fetch failed", e);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const fetchIntakeSummary = async () => {
        if (!consultationId) return;
        setLoadingIntake(true);
        try {
            const res = await api.get(`/consultations/${consultationId}/intake_summary`);
            setIntakeData(res.data);
        } catch (e) {
            console.error("Intake summary failed", e);
        } finally {
            setLoadingIntake(false);
        }
    };

    const handleRecordingComplete = async (blob: Blob) => {
        setAiStatus("processing");
        const formData = new FormData();
        formData.append("file", blob, `consultation_${consultationId}.webm`);
        formData.append("source", "CONSULTATION");

        try {
            await api.post(`/consultations/${consultationId}/upload`, formData);
            toast.success("Recording uploaded. Generating transcript...");
        } catch (e) {
            console.error("Upload failed", e);
            toast.error("Upload failed.");
            setAiStatus("idle");
        }
    };

    const handleReprocessAudio = async () => {
        setAiStatus("processing");
        try {
            await api.post(`/consultations/${consultationId}/reprocess_audio`);
            toast.success("Transcription started.");
        } catch (e) {
            console.error("Reprocess failed", e);
            toast.error("Failed to start transcription.");
            setAiStatus("idle");
        }
    };

    const handleSaveClinicalData = async (silent = false) => {
        try {
            await api.patch(`/consultations/${consultationId}`, {
                notes,
                diagnosis,
                prescription,
                transcript: transcriptionText // Save edited transcript
            });
            if (!silent) toast.success("Data saved successfully.");
        } catch (e) {
            console.error("Save failed", e);
            if (!silent) toast.error("Failed to save data.");
        }
    };

    const handleComplete = async () => {
        await handleSaveClinicalData(true);
        await api.patch(`/consultations/${consultationId}/finish`);
        toast.success("Consultation completed!");
        onComplete();
    };

    if (!consultationId) {
        return (
            <Card className="h-full flex items-center justify-center bg-muted/20 border-dashed border-2">
                <div className="text-center text-muted-foreground">
                    <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-muted-foreground/10">
                        <LayoutDashboard className="h-10 w-10 opacity-40" />
                    </div>
                    <h3 className="text-xl font-semibold">No Consultation Selected</h3>
                    <p className="max-w-[300px] mt-2 opacity-70">
                        Select a patient from the Queue or Dashboard to begin.
                    </p>
                </div>
            </Card>
        );
    }

    if (loading && !consultation) {
        return (
            <div className="flex-1 p-8 space-y-8">
                <Skeleton className="h-20 w-full rounded-xl" />
                <div className="grid grid-cols-3 gap-8">
                    <Skeleton className="col-span-2 h-[600px] rounded-xl" />
                    <Skeleton className="h-[600px] rounded-xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 p-2">

            {/* Stepper Header */}
            <div className="flex items-center justify-between bg-card border rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-8">
                    {[
                        { step: 1, label: "Intake Review", icon: Stethoscope },
                        { step: 2, label: "Consultation & Transcript", icon: Mic },
                        { step: 3, label: "Clinical Plan", icon: CheckCircle }
                    ].map((s) => (
                        <div key={s.step} className={cn(
                            "flex items-center gap-2 transition-colors",
                            currentStep === s.step ? "text-primary font-bold" :
                                currentStep > s.step ? "text-green-600 font-medium" : "text-muted-foreground"
                        )}>
                            <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center border-2 text-sm",
                                currentStep === s.step ? "border-primary bg-primary/10" :
                                    currentStep > s.step ? "border-green-600 bg-green-50" : "border-muted-foreground/30"
                            )}>
                                {currentStep > s.step ? <CheckCircle className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                            </div>
                            <span className="hidden lg:inline">{s.label}</span>
                            {s.step < 3 && <div className={cn("h-[2px] w-8 mx-2", currentStep > s.step ? "bg-green-600" : "bg-muted")} />}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {/* HIDE NAVIGATION ON STEP 1 */}
                    {currentStep > 1 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1) as Step)}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                    )}

                    {currentStep > 1 && currentStep < 3 && (
                        <Button
                            size="sm"
                            disabled={aiStatus === "processing"}
                            onClick={() => setCurrentStep(prev => Math.min(3, prev + 1) as Step)}
                        >
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}

                    {currentStep === 3 && (
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={handleComplete}
                        >
                            Complete <CheckCircle className="h-4 w-4 ml-1" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 min-h-0 relative">

                {/* Step 1: Intake Review */}
                {currentStep === 1 && (
                    <div className="h-full flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
                        <PreConsultationBrief
                            patient={consultation?.patient_profile || consultation?.appointment?.patient?.patient_profile}
                            intakeSummary={intakeData?.summary}
                            intakeTranscript={intakeData?.full_transcript}
                        />
                        <div className="flex justify-end mt-4">
                            <Button size="lg" onClick={() => setCurrentStep(2)} className="shadow-lg">
                                Begin Consultation <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Consultation & Transcript (Merged) */}
                {currentStep === 2 && (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">

                        {/* LEFT COLUMN: Record & Status */}
                        <div className="flex flex-col gap-6">
                            <Card className="border-primary/20 shadow-md">
                                <CardHeader className="bg-primary/5 border-b border-primary/10">
                                    <CardTitle className="flex items-center gap-2">
                                        <Mic className="h-5 w-5 text-primary" /> Audio Documentation
                                    </CardTitle>
                                    <CardDescription>
                                        Record the consultation. Transcript will appear on the right.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <AudioRecorder
                                        onRecordingComplete={(blob) => handleRecordingComplete(blob)}
                                        className="bg-background shadow-inner"
                                    />
                                </CardContent>
                            </Card>

                            {/* Processing Indicator */}
                            {aiStatus === "processing" && (
                                <Card className="border-blue-200 bg-blue-50/50">
                                    <CardContent className="flex items-center gap-4 p-6">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                        <div>
                                            <h4 className="font-bold text-blue-800">Analyzing Audio...</h4>
                                            <p className="text-sm text-blue-600">Generating transcript...</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Audio Player (if exists) */}
                            {consultation?.audio_files?.[0]?.file_url && (
                                <Card className="mt-4 border-none shadow-sm bg-muted/20">
                                    <CardContent className="p-4">
                                        <p className="text-xs font-semibold mb-2">Last Recording</p>
                                        <audio
                                            controls
                                            className="w-full h-8"
                                            src={`http://localhost:8000/uploads/${consultation.audio_files[0].file_name}`}
                                        />
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Transcript View */}
                        <div className="flex flex-col h-full gap-4 min-h-0">
                            {aiStatus === "idle" && !transcriptionText ? (
                                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground bg-muted/10">
                                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                                    <h4 className="font-semibold">Transcript Waiting</h4>
                                    <p className="text-sm max-w-[200px] mb-4">Recording analysis will appear here automatically.</p>

                                    {/* Show Generate Button if audio exists but no transcript */}
                                    {consultation?.audio_files?.some((f: any) => f.file_type === "CONSULTATION") && (
                                        <Button
                                            variant="outline"
                                            onClick={handleReprocessAudio}
                                            className="mt-2"
                                        >
                                            <Sparkles className="h-4 w-4 mr-2" /> Generate Transcript
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col h-full gap-4">
                                    <TranscriptView
                                        transcript={transcriptionText}
                                        isTranscribing={aiStatus === "processing"}
                                        onTranscriptChange={setTranscriptionText}
                                        readOnly={false}
                                        className="flex-1"
                                    />
                                    {transcriptionText && (
                                        <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl shrink-0">
                                            <p className="text-xs text-muted-foreground">Edits can be saved as draft.</p>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => handleSaveClinicalData()}>
                                                    <Save className="h-4 w-4 mr-2" /> Save Draft
                                                </Button>
                                                <Button size="sm" onClick={() => setCurrentStep(3)}>
                                                    Generate Clinical Plan <ChevronRight className="h-4 w-4 ml-2" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Clinical Plan */}
                {currentStep === 3 && (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                        {/* Left: AI & Transcript Reference */}
                        <div className="flex flex-col gap-4 h-full min-h-0">
                            <Card className="flex flex-col border-none shadow-md h-full bg-slate-50/80">
                                <CardHeader className="py-3 border-b">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <BrainCircuit className="h-4 w-4 text-primary" /> AI SOAP Note
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto p-4 text-sm">
                                    {consultation?.soap_note?.soap_json ? (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-white rounded-lg shadow-sm border">
                                                <h5 className="font-bold text-xs uppercase text-muted-foreground mb-1">Subjective</h5>
                                                <p>{consultation.soap_note.soap_json.soap_note.subjective}</p>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg shadow-sm border">
                                                <h5 className="font-bold text-xs uppercase text-muted-foreground mb-1">Objective</h5>
                                                <p>{consultation.soap_note.soap_json.soap_note.objective}</p>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg shadow-sm border">
                                                <h5 className="font-bold text-xs uppercase text-muted-foreground mb-1">Assessment</h5>
                                                <p>{consultation.soap_note.soap_json.soap_note.assessment}</p>
                                            </div>
                                            <div className="p-3 bg-white rounded-lg shadow-sm border">
                                                <h5 className="font-bold text-xs uppercase text-muted-foreground mb-1">Plan</h5>
                                                <p>{consultation.soap_note.soap_json.soap_note.plan}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                                            <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                            <p>Generating SOAP...</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <SafetyAlerts warnings={safetyWarnings} />
                        </div>

                        {/* Right: Final Documentation */}
                        <Card className="flex flex-col border-none shadow-md h-full">
                            <CardHeader className="py-3 border-b bg-green-50/30">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-green-800">
                                    <FileText className="h-4 w-4" /> Final Documentation
                                </CardTitle>
                            </CardHeader>
                            <ScrollArea className="flex-1">
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Diagnosis (ICD-10)</Label>
                                        <Input
                                            value={diagnosis}
                                            onChange={e => setDiagnosis(e.target.value)}
                                            className="bg-white"
                                            placeholder="Primary Diagnosis"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prescription</Label>
                                        <Textarea
                                            value={prescription}
                                            onChange={e => setPrescription(e.target.value)}
                                            className="bg-white min-h-[100px]"
                                            placeholder="Rx details..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Clinical Notes / Private</Label>
                                        <Textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="bg-white min-h-[100px]"
                                            placeholder="Internal notes..."
                                        />
                                    </div>
                                </CardContent>
                            </ScrollArea>
                            <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">Changes autosaved.</span>
                                <Button onClick={() => handleSaveClinicalData()} variant="outline" size="sm">
                                    <Save className="h-4 w-4 mr-2" /> Save Draft
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
