import { Loader2, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TranscriptViewProps {
    transcript: string;
    isTranscribing: boolean;
    error?: string | null;
    onTranscriptChange: (text: string) => void;
    onRetry?: () => void;
    className?: string;
    readOnly?: boolean;
}

export function TranscriptView({
    transcript,
    isTranscribing,
    error,
    onTranscriptChange,
    onRetry,
    className,
    readOnly = false
}: TranscriptViewProps) {

    if (isTranscribing) {
        return (
            <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-8">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="font-medium text-foreground">Transcribing your recording...</p>
                            <p className="text-sm text-muted-foreground">This may take a few seconds</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-destructive">Transcription Failed</p>
                            <p className="text-sm text-muted-foreground mt-1">{error}</p>
                            {onRetry && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={onRetry}
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Try Recording Again
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!transcript && !isTranscribing && !error) {
        return null;
    }

    return (
        <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Transcribed Symptoms / Notes
                </CardTitle>
                <CardDescription>
                    {readOnly
                        ? "Review the transcribed text."
                        : "Please review and correct the transcription if needed before submitting."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="Transcription text..."
                    value={transcript}
                    onChange={(e) => onTranscriptChange(e.target.value)}
                    rows={6}
                    className="resize-none bg-background"
                    disabled={readOnly}
                />
                {!readOnly && (
                    <p className="text-xs text-muted-foreground">
                        <strong>Important:</strong> This text will be used for AI triage and shared with your doctor.
                        Make sure it accurately reflects your symptoms.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
