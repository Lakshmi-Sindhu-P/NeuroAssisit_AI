import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Mic, Square, Play, Pause, FileAudio, CheckCircle, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface RedoAudioDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (file: File) => void;
}

export function RedoAudioDialog({ isOpen, onClose, onComplete }: RedoAudioDialogProps) {
    const [activeTab, setActiveTab] = useState("upload");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setSelectedFile(null);
            setRecordedBlob(null);
            setRecordedUrl(null);
            setIsRecording(false);
            setIsPaused(false);
            setRecordingTime(0);
            setActiveTab("upload");
        }
    }, [isOpen]);

    // Cleanup URL
    useEffect(() => {
        return () => {
            if (recordedUrl) URL.revokeObjectURL(recordedUrl);
        };
    }, [recordedUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
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
                setRecordedBlob(blob);
                const url = URL.createObjectURL(blob);
                setRecordedUrl(url);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);
            startTimer();

        } catch (error) {
            console.error(error);
            toast.error("Microphone access denied.");
        }
    };

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            stopTimer();
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            startTimer();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            stopTimer();
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDiscard = () => {
        setRecordedBlob(null);
        setRecordedUrl(null);
    };

    const handleConfirm = () => {
        if (activeTab === "upload" && selectedFile) {
            onComplete(selectedFile);
            onClose();
        } else if (activeTab === "record" && recordedBlob) {
            const file = new File([recordedBlob], "redo_recording.webm", { type: "audio/webm" });
            onComplete(file);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Update Consultation Audio</DialogTitle>
                    <DialogDescription>
                        Upload a new file or record a new session. This will regenerate the SOAP note.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">Upload File</TabsTrigger>
                        <TabsTrigger value="record">Record Audio</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4 py-4">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 hover:bg-muted/50 transition-colors">
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <Label htmlFor="redo-file" className="cursor-pointer text-sm font-medium text-primary hover:underline">
                                Click to browse
                            </Label>
                            <Input
                                id="redo-file"
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {selectedFile ? (
                                <div className="mt-2 text-sm text-foreground flex items-center gap-2 bg-muted px-3 py-1 rounded">
                                    <FileAudio className="w-4 h-4" />
                                    {selectedFile.name}
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground mt-1">MP3, WAV, M4A, WEBM supported</span>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="record" className="space-y-4 py-4">
                        <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg space-y-4">
                            <div className="text-3xl font-mono font-bold tabular-nums">
                                {formatTime(recordingTime)}
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-4">
                                {!isRecording && !recordedBlob && (
                                    <Button onClick={startRecording} variant="default" size="lg" className="rounded-full w-16 h-16 p-0 shadow-lg bg-red-600 hover:bg-red-700 hover:scale-105 transition-transform flex flex-col gap-1">
                                        <Mic className="w-6 h-6" />
                                        <span className="text-[10px] font-semibold">REC</span>
                                    </Button>
                                )}

                                {isRecording && (
                                    <>
                                        {isPaused ? (
                                            <Button onClick={resumeRecording} variant="outline" size="icon" className="rounded-full w-12 h-12 border-2 border-blue-500 text-blue-500 hover:bg-blue-50" title="Resume">
                                                <Play className="w-5 h-5 ml-1" />
                                            </Button>
                                        ) : (
                                            <Button onClick={pauseRecording} variant="outline" size="icon" className="rounded-full w-12 h-12 border-2 border-amber-500 text-amber-500 hover:bg-amber-50" title="Pause">
                                                <Pause className="w-5 h-5" />
                                            </Button>
                                        )}

                                        <Button onClick={stopRecording} variant="outline" size="lg" className="rounded-full w-16 h-16 p-0 border-4 border-destructive animate-pulse bg-white text-destructive hover:bg-red-50" title="Stop">
                                            <Square className="w-6 h-6 fill-current" />
                                        </Button>
                                    </>
                                )}
                            </div>

                            {/* Post-Recording Preview */}
                            {!isRecording && recordedBlob && (
                                <div className="w-full space-y-3 animate-in fade-in zoom-in duration-300">
                                    <div className="bg-background rounded-md p-2 border shadow-sm">
                                        <audio controls src={recordedUrl!} className="w-full h-10" />
                                    </div>
                                    <div className="flex justify-center gap-3">
                                        <Button onClick={handleDiscard} variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Discard
                                        </Button>
                                        <Button onClick={() => { handleDiscard(); startRecording(); }} variant="outline" size="sm">
                                            <RefreshCcw className="w-4 h-4 mr-2" />
                                            Retake
                                        </Button>
                                    </div>
                                    <div className="text-center">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full ring-1 ring-green-600/20">
                                            <CheckCircle className="w-3 h-3" /> Ready to Process
                                        </span>
                                    </div>
                                </div>
                            )}

                            {isRecording && <p className="text-center text-xs text-muted-foreground animate-pulse font-medium">{isPaused ? "Recording Paused" : "Recording..."}</p>}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={onClose} className="text-muted-foreground">Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={(activeTab === "upload" && !selectedFile) || (activeTab === "record" && !recordedBlob)}
                        className="bg-primary hover:bg-primary/90"
                    >
                        Process Audio
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
