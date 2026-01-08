import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Mic,
    MicOff,
    Play,
    Pause,
    Square,
    RefreshCw,
    Shield,
    CheckCircle2,
    Brain,
    ArrowRight,
    ArrowLeft,
    Search,
    Stethoscope,
    UserPlus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { formatName, formatDoctorName } from "@/lib/formatName";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { validateIndianPhone } from "@/components/IndianPhoneInput";

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
}

interface Doctor {
    id: string;
    first_name: string;
    last_name: string;
    specialization: string;
}

export default function PatientCheckIn() {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(1);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [doctorSearchQuery, setDoctorSearchQuery] = useState("");

    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [waveformData, setWaveformData] = useState<number[]>(new Array(30).fill(0.1));
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Patient Form State
    const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
    const [newPatientData, setNewPatientData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        age: "",
        gender: "",
    });
    const [newPatientErrors, setNewPatientErrors] = useState<any>({});

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const patientsData = await apiRequest("/frontdesk/patients");
            const doctorsData = await apiRequest("/frontdesk/doctors");
            setPatients(patientsData);
            setDoctors(doctorsData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        }
    };

    const filteredPatients = patients.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredDoctors = doctors.filter(d =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(doctorSearchQuery.toLowerCase()) ||
        d.specialization.toLowerCase().includes(doctorSearchQuery.toLowerCase())
    );

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const updateWaveform = useCallback(() => {
        if (analyserRef.current && isRecording && !isPaused) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const samples = 30;
            const blockSize = Math.floor(dataArray.length / samples);
            const newWaveform = [];
            for (let i = 0; i < samples; i++) {
                let sum = 0;
                for (let j = 0; j < blockSize; j++) {
                    sum += dataArray[i * blockSize + j];
                }
                const normalized = (sum / blockSize) / 255;
                newWaveform.push(Math.max(0.1, normalized));
            }
            setWaveformData(newWaveform);
            animationFrameRef.current = requestAnimationFrame(updateWaveform);
        }
    }, [isRecording, isPaused]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
            animationFrameRef.current = requestAnimationFrame(updateWaveform);
        } catch (error) {
            toast({ title: "Microphone error", description: "Allow access to record.", variant: "destructive" });
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            setWaveformData(new Array(30).fill(0.3));
        }
    };

    const handleAddNewPatient = async () => {
        // Basic validation
        const errors: any = {};
        if (!newPatientData.firstName) errors.firstName = "Required";
        if (!newPatientData.lastName) errors.lastName = "Required";
        if (!newPatientData.email) errors.email = "Required";
        if (!newPatientData.age) errors.age = "Required";
        if (!newPatientData.gender) errors.gender = "Required";
        if (!newPatientData.phone) errors.phone = "Required";
        else if (!validateIndianPhone(newPatientData.phone)) errors.phone = "Invalid format";

        if (Object.keys(errors).length > 0) {
            setNewPatientErrors(errors);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await apiRequest("/auth/signup", {
                method: "POST",
                body: JSON.stringify({
                    email: newPatientData.email,
                    password: "Welcome@123", // Default for walk-ins
                    role: "PATIENT",
                    first_name: newPatientData.firstName,
                    last_name: newPatientData.lastName,
                    phone: newPatientData.phone,
                    age: parseInt(newPatientData.age),
                    gender: newPatientData.gender,
                })
            });

            toast({ title: "Patient Registered", description: "Account created successfully." });

            // Refresh list and select new patient
            await fetchData();
            setSelectedPatientId(res.user_id);
            setIsNewPatientOpen(false);
            setNewPatientData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                age: "",
                gender: "",
            });
            setNewPatientErrors({});
        } catch (error: any) {
            toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedPatientId || !selectedDoctorId) {
            toast({ title: "Selection Required", description: "Please select a patient and a doctor.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await apiRequest("/admin/check-in", {
                method: "POST",
                body: JSON.stringify({
                    patient_id: selectedPatientId,
                    doctor_id: selectedDoctorId,
                    notes: additionalNotes,
                    // Let backend know if audio recording exists
                    audio_provided: !!audioBlob
                })
            });

            if (audioBlob) {
                const formData = new FormData();
                formData.append("file", audioBlob, "symptoms.webm");
                await apiRequest(`/consultations/${res.consultation_id}/upload`, {
                    method: "POST",
                    headers: {},
                    body: formData
                });
            }

            toast({ title: "Success", description: "Patient checked in successfully." });
            navigate("/admin/dashboard");
        } catch (error: any) {
            toast({ title: "Check-in Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-12 animate-fade-in-up">
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20 mb-2">
                    <UserPlus className="h-3.5 w-3.5" /> Front Desk Intake
                </div>
                <h1 className="text-4xl font-bold text-foreground">Patient Check-in</h1>
                <p className="text-lg text-muted-foreground/80 max-w-xl mx-auto">Register arrival, assign specialists, and record symptoms with AI-ready intake.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Step 1: Patient Selection */}
                <Card className="border-border/40 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="bg-muted/30 border-b border-border/40 p-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-lg font-bold">
                                <div className="w-10 h-10 rounded-xl medical-gradient flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                Select Patient
                            </CardTitle>

                            <Dialog open={isNewPatientOpen} onOpenChange={setIsNewPatientOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2 rounded-lg border-primary/20 text-primary hover:bg-primary/5">
                                        <UserPlus className="h-4 w-4" />
                                        New
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Register New Patient</DialogTitle>
                                        <DialogDescription>
                                            Add details for a walk-in patient. A temporary account will be created.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="firstName">First Name</Label>
                                                <Input
                                                    id="firstName"
                                                    value={newPatientData.firstName}
                                                    onChange={(e) => setNewPatientData({ ...newPatientData, firstName: e.target.value })}
                                                    className={newPatientErrors.firstName ? "border-destructive" : "rounded-xl"}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="lastName">Last Name</Label>
                                                <Input
                                                    id="lastName"
                                                    value={newPatientData.lastName}
                                                    onChange={(e) => setNewPatientData({ ...newPatientData, lastName: e.target.value })}
                                                    className={newPatientErrors.lastName ? "border-destructive" : "rounded-xl"}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-email">Email</Label>
                                            <Input
                                                id="new-email"
                                                type="email"
                                                value={newPatientData.email}
                                                onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                                                className={newPatientErrors.email ? "border-destructive" : "rounded-xl"}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="new-age">Age</Label>
                                                <Input
                                                    id="new-age"
                                                    type="number"
                                                    value={newPatientData.age}
                                                    onChange={(e) => setNewPatientData({ ...newPatientData, age: e.target.value })}
                                                    className={newPatientErrors.age ? "border-destructive" : "rounded-xl"}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="new-gender">Gender</Label>
                                                <Select
                                                    value={newPatientData.gender}
                                                    onValueChange={(val) => setNewPatientData({ ...newPatientData, gender: val })}
                                                >
                                                    <SelectTrigger className={cn("rounded-xl", newPatientErrors.gender ? "border-destructive" : "")}>
                                                        <SelectValue placeholder="Select" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-card">
                                                        <SelectItem value="male">Male</SelectItem>
                                                        <SelectItem value="female">Female</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="new-phone">Phone Number (+91)</Label>
                                            <Input
                                                id="new-phone"
                                                placeholder="9876543210"
                                                value={newPatientData.phone}
                                                onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                                                className={newPatientErrors.phone ? "border-destructive" : "rounded-xl"}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddNewPatient} disabled={isSubmitting} className="w-full rounded-xl">
                                            {isSubmitting ? <RefreshCw className="animate-spin mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                            Register Patient
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-xl border border-border/40 p-2 bg-muted/5">
                            {filteredPatients.length > 0 ? filteredPatients.map(p => (
                                <div
                                    key={p.id}
                                    className={cn(
                                        "p-4 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-white hover:shadow-sm",
                                        selectedPatientId === p.id ? "bg-white border-primary/20 shadow-md ring-1 ring-primary/10" : "opacity-80 hover:opacity-100"
                                    )}
                                    onClick={() => setSelectedPatientId(p.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                                            selectedPatientId === p.id ? "bg-primary text-white" : "bg-primary/10 text-primary"
                                        )}>
                                            {p.first_name[0]}{p.last_name[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground text-sm">{formatName(`${p.first_name} ${p.last_name}`)}</p>
                                            <p className="text-[11px] text-muted-foreground font-medium">{p.email}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 space-y-2 opacity-40">
                                    <Users className="h-10 w-10 mx-auto" />
                                    <p className="text-sm font-medium">No patients found</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Step 2: Doctor Selection */}
                <Card className="border-border/40 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="bg-muted/30 border-b border-border/40 p-6">
                        <CardTitle className="flex items-center gap-3 text-lg font-bold">
                            <div className="w-10 h-10 rounded-xl medical-gradient flex items-center justify-center">
                                <Stethoscope className="h-5 w-5 text-primary" />
                            </div>
                            Assign Doctor
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/60 bg-muted/20 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="Search specialist..."
                                value={doctorSearchQuery}
                                onChange={(e) => setDoctorSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-xl border border-border/40 p-2 bg-muted/5">
                            {filteredDoctors.length > 0 ? filteredDoctors.map(d => (
                                <div
                                    key={d.id}
                                    className={cn(
                                        "p-4 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-white hover:shadow-sm",
                                        selectedDoctorId === d.id ? "bg-white border-primary/20 shadow-md ring-1 ring-primary/10" : "opacity-80 hover:opacity-100"
                                    )}
                                    onClick={() => setSelectedDoctorId(d.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                                            selectedDoctorId === d.id ? "bg-primary text-white" : "bg-primary/10 text-primary"
                                        )}>
                                            <Stethoscope className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground text-sm">{formatDoctorName(d.first_name, d.last_name)}</p>
                                            <p className="text-[11px] text-primary font-bold uppercase tracking-tighter">{d.specialization}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 space-y-2 opacity-40">
                                    <Stethoscope className="h-10 w-10 mx-auto" />
                                    <p className="text-sm font-medium">No doctors available</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Step 3: Recording Symptoms */}
            <Card className="border-border/40 shadow-sm overflow-hidden animate-fade-in-up [animation-delay:200ms]">
                <CardHeader className="bg-muted/30 border-b border-border/40 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl medical-gradient flex items-center justify-center">
                            <Mic className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">Health Intake</CardTitle>
                            <CardDescription>Capture immediate symptoms for priority triage</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="bg-muted/10 rounded-3xl p-10 space-y-8 border-2 border-dashed border-border/40 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="text-center space-y-4 relative z-10">
                            <div className="text-[52px] font-mono font-bold text-foreground tracking-tight tabular-nums tabular-nums">
                                {formatTime(recordingTime)}
                            </div>
                            <p className="text-sm font-bold text-primary uppercase tracking-widest flex items-center justify-center gap-2">
                                {isRecording && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                                {isRecording ? "Listening to Patient..." : audioBlob ? "Recording Completed" : "Ready to Start"}
                            </p>
                        </div>

                        <div className="w-full h-24 flex items-center justify-center gap-2 relative z-10 px-10">
                            {waveformData.map((h, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-2.5 rounded-full transition-all duration-150",
                                        isRecording ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]" : "bg-muted-foreground/10"
                                    )}
                                    style={{
                                        height: `${h * 100}%`,
                                        minHeight: '8px',
                                        maxHeight: '100%',
                                        opacity: 0.3 + (h * 0.7)
                                    }}
                                />
                            ))}
                        </div>

                        <div className="flex justify-center gap-6 relative z-10">
                            {!isRecording && !audioBlob && (
                                <Button
                                    onClick={startRecording}
                                    className="rounded-full w-20 h-20 shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 animate-pulse-medical bg-primary hover:bg-primary/90"
                                >
                                    <Mic className="h-8 w-8 text-white" />
                                </Button>
                            )}
                            {isRecording && (
                                <Button
                                    onClick={stopRecording}
                                    variant="destructive"
                                    className="rounded-full w-20 h-20 shadow-xl hover:scale-110 active:scale-95 transition-all duration-300"
                                >
                                    <Square className="h-8 w-8" />
                                </Button>
                            )}
                            {audioBlob && (
                                <div className="flex items-center gap-4">
                                    <Button
                                        onClick={() => { setAudioBlob(null); setAudioUrl(null); setRecordingTime(0); }}
                                        variant="outline"
                                        className="rounded-full px-8 h-12 font-bold border-primary/20 text-primary hover:bg-primary/5"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" /> Start Over
                                    </Button>
                                    <div className="px-6 py-3 rounded-full bg-green-50 border border-green-100 text-green-700 text-sm font-bold flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> Ready to Submit
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label htmlFor="notes" className="text-sm font-bold text-foreground">Visual Observations / Notes</Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any visible distress, urgency signs, or details not captured in the recording..."
                            value={additionalNotes}
                            onChange={(e) => setAdditionalNotes(e.target.value)}
                            className="rounded-2xl border-border/60 bg-muted/5 focus:bg-background focus:ring-primary/10 resize-none h-32 p-4 text-base transition-all"
                        />
                        <div className="flex items-center gap-2 text-muted-foreground/60 p-1 px-2">
                            <Shield className="h-4 w-4" />
                            <p className="text-xs font-medium italic">Symptom recording is clinical aid, not a final diagnosis.</p>
                        </div>
                    </div>

                    <Button
                        className="w-full h-16 text-xl font-bold shadow-lg shadow-primary/20 rounded-2xl transition-all duration-300 hover:shadow-xl active:scale-[0.99] disabled:opacity-40"
                        size="lg"
                        disabled={isSubmitting || !selectedPatientId || !selectedDoctorId}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? (
                            <><RefreshCw className="animate-spin mr-3 h-6 w-6" /> Finalizing Triage...</>
                        ) : (
                            <><CheckCircle2 className="mr-3 h-6 w-6" /> Complete Check-in</>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div >
    );
}
