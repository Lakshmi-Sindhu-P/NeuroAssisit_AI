import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Play, Pause, Square, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
    onRecordingComplete: (blob: Blob, url: string) => void;
    onReset?: () => void;
    className?: string;
}

export function AudioRecorder({ onRecordingComplete, onReset, className }: AudioRecorderProps) {
    const { toast } = useToast();

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [waveformData, setWaveformData] = useState<number[]>(new Array(30).fill(0.1));

    // Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

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
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);

                // Cleanup tracks
                stream.getTracks().forEach(track => track.stop());

                // Notify parent
                onRecordingComplete(blob, url);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

            animationFrameRef.current = requestAnimationFrame(updateWaveform);

        } catch (error) {
            toast({
                title: "Microphone Access Required",
                description: "Please allow microphone access to record.",
                variant: "destructive",
            });
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording && !isPaused) {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && isRecording && isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
            animationFrameRef.current = requestAnimationFrame(updateWaveform);
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

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const resetRecording = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setIsPlaying(false);
        setIsPaused(false);
        setWaveformData(new Array(30).fill(0.1));
        if (onReset) onReset();
    };

    // Cleanup
    useEffect(() => {
        if (audioUrl) {
            audioRef.current = new Audio(audioUrl);
            audioRef.current.onended = () => setIsPlaying(false);
        }
        return () => {
            if (audioRef.current) audioRef.current.pause();
        };
    }, [audioUrl]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    return (
        <div className={cn("bg-muted/30 rounded-xl p-6 space-y-5", className)}>
            {/* Waveform Visualization */}
            <div className="w-full h-16 flex items-center justify-center gap-1">
                {waveformData.map((height, index) => (
                    <div
                        key={index}
                        className={cn(
                            "w-1.5 rounded-full transition-all duration-75",
                            isRecording && !isPaused
                                ? 'bg-primary'
                                : audioBlob
                                    ? 'bg-primary/60'
                                    : 'bg-muted-foreground/20'
                        )}
                        style={{
                            height: `${height * 60}px`,
                            minHeight: '6px',
                        }}
                    />
                ))}
            </div>

            {/* Timer */}
            <div className="text-center">
                <span className="text-3xl font-mono font-semibold text-foreground">
                    {formatTime(recordingTime)}
                </span>
                {isRecording && isPaused && (
                    <span className="ml-2 text-sm text-muted-foreground">(Paused)</span>
                )}
            </div>

            {/* Recording Controls */}
            <div className="flex justify-center gap-4">
                {!audioBlob ? (
                    <>
                        {!isRecording ? (
                            <Button
                                size="lg"
                                className="w-20 h-20 rounded-full hover:scale-105 shadow-lg shadow-primary/20"
                                onClick={startRecording}
                            >
                                <Mic className="h-8 w-8" />
                            </Button>
                        ) : (
                            <>
                                {isPaused ? (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-14 h-14 rounded-full"
                                        onClick={resumeRecording}
                                    >
                                        <Play className="h-5 w-5 ml-0.5" />
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="w-14 h-14 rounded-full"
                                        onClick={pauseRecording}
                                    >
                                        <Pause className="h-5 w-5" />
                                    </Button>
                                )}
                                <Button
                                    size="lg"
                                    variant="destructive"
                                    className="w-14 h-14 rounded-full"
                                    onClick={stopRecording}
                                >
                                    <Square className="h-5 w-5" />
                                </Button>
                            </>
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-4">
                        <Button
                            size="lg"
                            variant="outline"
                            className="w-14 h-14 rounded-full"
                            onClick={togglePlayback}
                        >
                            {isPlaying ? (
                                <Pause className="h-5 w-5" />
                            ) : (
                                <Play className="h-5 w-5 ml-0.5" />
                            )}
                        </Button>
                        <Button
                            size="lg"
                            variant="ghost"
                            className="w-14 h-14 rounded-full"
                            onClick={resetRecording}
                        >
                            <RefreshCw className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Status Text */}
            <p className="text-center text-sm text-muted-foreground">
                {isRecording && !isPaused
                    ? "Recording... Tap pause or stop"
                    : isRecording && isPaused
                        ? "Paused. Tap play to resume or stop to finish."
                        : audioBlob
                            ? "Recording complete. Play to review or re-record."
                            : "Tap the microphone to start recording"}
            </p>
        </div>
    );
}
