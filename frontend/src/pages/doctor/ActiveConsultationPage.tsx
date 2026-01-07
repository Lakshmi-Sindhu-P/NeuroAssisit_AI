
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save, CheckCircle, Upload, FileText, AlertTriangle, User, Brain, RotateCcw, Printer } from "lucide-react";
import { SafetyAlerts } from "@/components/doctor/SafetyAlerts";
import { PreConsultationBrief } from "@/components/doctor/PreConsultationBrief";
import { PrescriptionWriter, PrescriptionItem } from "@/components/doctor/PrescriptionWriter";
import { SafetyService } from "@/services/SafetyService";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PatientSidebar } from "@/components/doctor/PatientSidebar";
import { FormattedText } from "@/components/FormattedText";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RedoAudioDialog } from "@/components/doctor/RedoAudioDialog";
import { TranscriptView } from "@/components/doctor/TranscriptView";

export default function ActiveConsultationPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [consultation, setConsultation] = useState<any>(null);
    // Document Gen State
    const [generatingDoc, setGeneratingDoc] = useState(false);
    const [generatedDocContent, setGeneratedDocContent] = useState("");
    const [patient, setPatient] = useState<any>(null);
    // Document Upload existing state...
    const [documents, setDocuments] = useState<any[]>([]);
    const [localWarnings, setLocalWarnings] = useState<any[]>([]);

    // Redo Dialog State
    const [redoDialogOpen, setRedoDialogOpen] = useState(false);
    const [aiStatus, setAiStatus] = useState<"idle" | "processing" | "transcript_ready" | "soap_ready">("idle");

    // Form State
    const [notes, setNotes] = useState("");
    const [diagnosis, setDiagnosis] = useState("");
    const [prescription, setPrescription] = useState("");

    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Audio Upload
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!id) return;
        fetchConsultation();

        // Polling if processing
        const interval = setInterval(() => {
            if (aiStatus === "processing") {
                fetchConsultation(true);
            }
        }, 3000);

        return () => {
            clearInterval(interval);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id, aiStatus]);

    const fetchConsultation = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await api.get(`/consultations/${id}`);
            const data = res.data;
            setConsultation(data);
            console.log("Consultation Data Loaded:", data);

            // Set Patient Data
            if (data.patient_profile) {
                setPatient(data.patient_profile);
            } else if (data.appointment?.patient?.patient_profile) {
                setPatient(data.appointment.patient.patient_profile);
            }

            // Set Form Data
            // "notes" is the Private Scratchpad. We want to sync it with DB, even if empty.
            // Explicitly allow empty string to override 'prev' to fix the "Ghosting" issue.
            setNotes(prev => (!silent || !prev) ? (data.notes || "") : prev);

            setDiagnosis(prev => (!silent || !prev) && data.diagnosis ? data.diagnosis : prev);
            setPrescription(prev => (!silent || !prev) && data.prescription ? data.prescription : prev);

            // check AI status
            if (data.status === "FAILED") {
                setAiStatus("idle"); // or 'error' state if we had one, for now idle stops the spinner
                if (!silent) toast.error("Analysis failed. Please try again.");
            } else if (data.soap_note) {
                setAiStatus("soap_ready");
            } else if (data.status === "IN_PROGRESS") {
                // Check if transcript exists (we check audio_files for transcription field)
                const hasTranscript = data.audio_files?.some((f: any) => f.transcription);
                if (hasTranscript) {
                    setAiStatus("transcript_ready");
                } else {
                    setAiStatus("processing");
                }
            } else {
                setAiStatus("idle");
            }

        } catch (error) {
            console.error(error);
            if (!silent) toast.error("Failed to load consultation.");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleGenerateSOAP = async () => {
        try {
            setAiStatus("processing");
            toast.info("Starting AI Analysis...");
            await api.post(`/consultations/${id}/generate_soap`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to start SOAP generation");
            fetchConsultation(true); // Revert state
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const recordedFile = new File([blob], "consultation_recording.webm", { type: "audio/webm" });
                setFile(recordedFile);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            toast.error("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleGenerateDoc = async (docType: string) => {
        setGeneratingDoc(true);
        try {
            const res = await api.post(`/consultations/${id}/generate-document`, {
                document_type: docType
            });
            setGeneratedDocContent(res.data.content);
            toast.success("Document generated!");
        } catch (e: any) {
            console.error(e);
            toast.error("Failed to generate document.");
        } finally {
            setGeneratingDoc(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleUpload = async (fileArg?: File | any) => {
        // If called from button click, fileArg is event. If called from Redo, it's File.
        const fileToUpload = (fileArg instanceof File) ? fileArg : file;

        if (!fileToUpload || !id) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("source", "CONSULTATION");

        try {
            await api.post(`/consultations/${id}/upload`, formData);
            setAiStatus("processing");
            toast.success("Audio uploaded. AI processing started.");

            // If redo, ensure soap is cleared
            setConsultation((prev: any) => prev ? ({ ...prev, soap_note: null }) : null);
        } catch (e: any) {
            toast.error("Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const handleRedoComplete = (newFile: File) => {
        setFile(newFile);
        // Clear SOAP immediately to trigger loading view
        setConsultation((prev: any) => prev ? ({ ...prev, soap_note: null }) : null);
        setAiStatus("processing");
        toast.info("New audio loaded. Restarting AI analysis...", { duration: 3000 });
        // We need to trigger upload immediately
        handleUpload(newFile);
    };

    const handleSave = async (silent = false) => {
        try {
            await api.patch(`/consultations/${id}`, {
                notes,
                diagnosis,
                prescription
            });
            if (!silent) toast.success("Draft saved.");
        } catch (e) {
            if (!silent) toast.error("Failed to save.");
        }
    };

    const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);

    const handleFinishClick = () => {
        setShowFinalizeDialog(true);
    };

    const confirmFinalize = async () => {
        setShowFinalizeDialog(false);
        await handleSave(true);
        try {
            await api.patch(`/consultations/${id}/finish`);
            toast.success("Consultation finalized.");
            navigate("/doctor/dashboard");
        } catch (e) {
            toast.error("Failed to finish consultation.");
        }
    };

    const handlePrescriptionValidate = (items: PrescriptionItem[]) => {
        if (!consultation?.patient_profile) return;

        const drugs = items.map(i => i.drug);
        const patientMeds = consultation.patient_profile.current_medications || [];
        const allergies = consultation.patient_profile.allergies || [];

        const newWarnings = SafetyService.checkInteractions(drugs, patientMeds, allergies);
        setLocalWarnings(newWarnings);
    };

    if (loading) return <div className="p-8 text-center">Loading consultation...</div>;
    if (!consultation) return <div className="p-8 text-center">Consultation not found.</div>;

    const soap = consultation.soap_note?.soap_json;
    const warnings = [...(consultation?.safety_warnings || []), ...localWarnings];

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/doctor/dashboard")}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {patient ? `${patient.first_name} ${patient.last_name}` : consultation.patient_id}
                            {aiStatus === "processing" && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded animate-pulse">AI Analysis...</span>}
                            {isRecording && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded animate-pulse flex items-center gap-1">● Recording {formatTime(recordingTime)}</span>}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {patient?.gender || "Unknown"}, {patient?.age || "N/A"} yrs • ID: {consultation.patient_id.slice(0, 8)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleSave(false)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Save Draft
                    </Button>
                    <Button
                        onClick={handleFinishClick}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Finalize Visit
                    </Button>
                </div>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
                {/* Left Column: Clinical Context (SOAP + History) */}
                <div className="col-span-8 flex flex-col gap-4 min-h-0">
                    <SafetyAlerts warnings={warnings} />

                    {/* Pre-Consultation Snapshot */}
                    {consultation?.patient_profile && (
                        <PreConsultationBrief
                            medications={consultation.patient_profile.current_medications}
                            allergies={consultation.patient_profile.allergies}
                            medicalHistory={consultation.patient_profile.medical_history}
                        />
                    )}

                    <Tabs defaultValue="soap" className="flex-1 flex flex-col min-h-0">
                        <div className="px-6 border-b bg-muted/5">
                            <TabsList className="h-12 w-full justify-start gap-6 bg-transparent p-0">
                                <TabsTrigger
                                    value="soap"
                                    className="h-12 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-none"
                                >
                                    AI SOAP Note
                                </TabsTrigger>
                                <TabsTrigger
                                    value="transcript"
                                    className="h-12 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-none"
                                >
                                    Transcript
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="h-12 rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-none"
                                >
                                    Past Consultations
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 bg-card border-x border-b rounded-b-lg mt-0 overflow-hidden shadow-sm flex flex-col">
                            <TabsContent value="soap" className="h-full m-0 p-0 flex flex-col data-[state=inactive]:hidden">
                                {aiStatus === "idle" && !soap && (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                        <div className="bg-muted p-4 rounded-full mb-4">
                                            {isRecording ? <div className="w-8 h-8 rounded-full bg-red-500 animate-pulse" /> : <Upload className="w-8 h-8 opacity-50" />}
                                        </div>
                                        <h3 className="font-semibold mb-2">
                                            {isRecording ? "Recording in Progress..." : (file ? "Ready to Polish" : "No Consultation Recording")}
                                        </h3>
                                        <p className="max-w-md mb-6">{isRecording ? "Capturing conversation..." : "Upload a session recording or start recording to generate automatic SOAP notes."}</p>

                                        {/* Audio Input Options Side-by-Side */}
                                        <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">

                                            {/* PRIMARY ACTION: Visualize (If file/recording exists) */}
                                            {file && (
                                                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <div className="glass-card p-6 flex flex-col items-center text-center">
                                                        <div className="flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full mb-6 ring-1 ring-primary/20">
                                                            <div className="p-2 bg-white rounded-full shadow-sm">
                                                                <FileText className="w-5 h-5 text-primary" />
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="font-semibold text-sm text-foreground">{file.name}</p>
                                                                <p className="text-xs text-muted-foreground">{file.type || "Audio File"} • Ready to Process</p>
                                                            </div>
                                                        </div>

                                                        {uploading ? (
                                                            <div className="flex flex-col items-center gap-4 py-4">
                                                                {/* WAVEFORM ANIMATION */}
                                                                <div className="flex items-center justify-center h-16 gap-1">
                                                                    {[...Array(9)].map((_, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className="waveform-bar bg-gradient-to-t from-primary to-purple-500"
                                                                            style={{ animationDelay: `${i * 0.1}s`, height: '40%' }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <p className="text-sm font-medium animate-pulse text-primary">Analyzing Consultation Audio...</p>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full flex flex-col items-center gap-4">
                                                                {/* Audio Player */}
                                                                {(file || consultation?.audio_files?.[0]) && (
                                                                    <audio
                                                                        controls
                                                                        src={file ? URL.createObjectURL(file) : `http://localhost:8000/${consultation.audio_files[0].file_path}`}
                                                                        className="w-full max-w-sm mb-2"
                                                                    />
                                                                )}

                                                                <Button onClick={handleUpload} size="lg" className="w-full max-w-sm h-12 text-base shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-primary to-purple-600 border-0">
                                                                    <Brain className="w-5 h-5 mr-2" />
                                                                    Visualize & Analyze Session
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ALTERNATE ACTIONS: Input Source Selection */}
                                            <div className="w-full mt-4">
                                                {file && (
                                                    <div className="relative flex items-center py-4">
                                                        <div className="flex-grow border-t border-border/50"></div>
                                                        <span className="flex-shrink-0 mx-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Or Change Source</span>
                                                        <div className="flex-grow border-t border-border/50"></div>
                                                    </div>
                                                )}

                                                <div className="flex items-stretch justify-center gap-8">
                                                    {/* Record Option */}
                                                    <div className="flex flex-col items-center gap-3 w-48">
                                                        <div className={`p-3 rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-red-50 text-red-600'} mb-1`}>
                                                            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-white' : 'bg-current'}`} />
                                                        </div>
                                                        <h4 className="font-semibold text-sm">Direct Recording</h4>
                                                        {!isRecording ? (
                                                            <Button onClick={startRecording} variant="default" className="w-full bg-red-600 hover:bg-red-700 text-white">
                                                                {file && !file.name.includes("consultation_recording") ? "Record New" : "Start"}
                                                            </Button>
                                                        ) : (
                                                            <Button onClick={stopRecording} variant="outline" className="w-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100">
                                                                Stop ({formatTime(recordingTime)})
                                                            </Button>
                                                        )}
                                                        <p className="text-xs text-muted-foreground text-center">Capture live consultation audio directly.</p>
                                                    </div>

                                                    {/* Vertical Divider */}
                                                    <div className="relative flex items-center justify-center">
                                                        <div className="absolute inset-y-0 left-1/2 w-px bg-border -translate-x-1/2" />
                                                        <span className="relative z-10 bg-card px-2 text-xs font-semibold text-muted-foreground bg-white">OR</span>
                                                    </div>

                                                    {/* Upload Option */}
                                                    <div className="flex flex-col items-center gap-3 w-48">
                                                        <div className="p-3 rounded-full bg-blue-50 text-blue-600 mb-1">
                                                            <Upload className="w-4 h-4" />
                                                        </div>
                                                        <div className="text-center">
                                                            <h4 className="font-semibold text-sm">Upload File</h4>
                                                            <p className="text-[10px] text-muted-foreground hidden">MP3, WAV, M4A</p>
                                                        </div>
                                                        <div className="w-full">
                                                            <Input
                                                                type="file"
                                                                accept="audio/*"
                                                                className="hidden"
                                                                id="audio-upload-input"
                                                                onChange={e => setFile(e.target.files?.[0] || null)}
                                                            />
                                                            <Label
                                                                htmlFor="audio-upload-input"
                                                                className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full ${isRecording ? 'opacity-50 pointer-events-none' : ''}`}
                                                            >
                                                                {file && !file.name.includes("consultation_recording") ? "Change File" : "Choose File"}
                                                            </Label>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground text-center">Upload existing audio (mp3, wav).</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {aiStatus === "processing" && !uploading && (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                                        <div className="flex items-center justify-center h-16 gap-1 mb-4">
                                            {[...Array(9)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className="waveform-bar bg-gradient-to-t from-primary to-purple-500"
                                                    style={{ animationDelay: `${i * 0.1}s`, height: '40%' }}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                                            {uploading ? "Uploading Audio..." : "Analyzing Consultation Audio..."}
                                        </p>
                                        <p className="text-muted-foreground text-sm">Extracting clinical entities & generating SOAP note.</p>
                                    </div>
                                )}

                                {soap && (
                                    <ScrollArea className="flex-1 p-6">
                                        <div className="max-w-3xl mx-auto space-y-6">
                                            <div className="flex justify-end mb-4">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setRedoDialogOpen(true)}
                                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <RotateCcw className="w-3 h-3 mr-2" />
                                                    Redo Audio
                                                </Button>
                                            </div>

                                            <section>
                                                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Subjective</h3>
                                                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-blue-900 leading-relaxed">
                                                    <FormattedText text={soap.subjective} />
                                                </div>
                                            </section>
                                            <section>
                                                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Objective</h3>
                                                <div className="p-4 bg-green-50/50 border border-green-100 rounded-lg text-green-900 leading-relaxed">
                                                    <FormattedText text={soap.objective} />
                                                </div>
                                            </section>
                                            <section>
                                                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Assessment</h3>
                                                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-900 leading-relaxed">
                                                    <FormattedText text={soap.assessment} />
                                                </div>
                                            </section>
                                            <section>
                                                <h3 className="text-sm font-bold uppercase text-muted-foreground mb-2">Plan</h3>
                                                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-lg text-purple-900 leading-relaxed">
                                                    <FormattedText text={soap.plan} />
                                                </div>
                                            </section>
                                        </div>
                                    </ScrollArea>
                                )}
                            </TabsContent>

                            <TabsContent value="transcript" className="h-full m-0 p-6 flex flex-col data-[state=inactive]:hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg">Consultation Transcript</h3>
                                        <p className="text-sm text-muted-foreground">Generated from audio recording.</p>
                                    </div>
                                    <div>
                                        {aiStatus === "transcript_ready" && (
                                            <Button onClick={handleGenerateSOAP} className="bg-primary hover:bg-primary/90">
                                                <Brain className="w-4 h-4 mr-2" />
                                                Generate SOAP Note
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 border rounded-md">
                                    <TranscriptView
                                        text={consultation?.audio_files?.[0]?.transcription}
                                        isProcessing={aiStatus === "processing"}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="history" className="h-full m-0 p-6 data-[state=inactive]:hidden">
                                {consultation.patient_id && <PatientSidebar patientId={consultation.patient_id} currentConsultationId={id} />}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Right Column: Documentation & Actions */}
                <div className="col-span-4 flex flex-col h-full min-h-0">
                    <Card className="flex flex-col h-full shadow-md border-t-4 border-t-primary">
                        <CardHeader className="py-4 border-b bg-muted/5">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Clinical Documentation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Diagnosis</Label>
                                <Textarea
                                    className="h-20 resize-none font-medium text-sm leading-relaxed"
                                    placeholder="Primary diagnosis | Secondary diagnosis..."
                                    value={diagnosis}
                                    onChange={e => setDiagnosis(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs uppercase font-bold text-muted-foreground">Prescription / Orders</Label>
                                <PrescriptionWriter
                                    initialValue={prescription}
                                    onChange={(text, items) => setPrescription(text)}
                                    onValidate={handlePrescriptionValidate}
                                />
                            </div>

                            <div className="space-y-2 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Internal Notes</Label>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Private</span>
                                </div>
                                <Textarea
                                    className="h-48 resize-none text-sm bg-yellow-50/50 placeholder:text-xs"
                                    placeholder={`PRIVATE SCRATCHPAD (Not shared with Patient/Referrals)

Use this space for:
1. Clinical observations & physical findings (Session notes)
2. Provisional diagnostic impressions (Working differentials)
3. Tentative treatment planning & counseling points
4. Barriers to care (Financial, compliance, logistical)
5. Reminders for follow-up & other administrative notes`}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <RedoAudioDialog
                isOpen={redoDialogOpen}
                onClose={() => setRedoDialogOpen(false)}
                onComplete={handleRedoComplete}
            />

            {/* Finalize Confirmation Dialog */}
            <Dialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Finalize Consultation?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. It will:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>Move the patient to 'My Patients' list</li>
                                <li>Lock the consultation notes preventing further edits</li>
                                <li>Auto-update patient demographics from the notes</li>
                            </ul>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowFinalizeDialog(false)}>Cancel</Button>
                        <Button onClick={confirmFinalize} className="bg-green-600 hover:bg-green-700">Confirm & Finalize</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
