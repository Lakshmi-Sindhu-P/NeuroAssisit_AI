import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TranscriptViewProps {
    text: string;
    isProcessing?: boolean;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({ text, isProcessing }) => {
    if (!text && isProcessing) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-pulse">
                <p>Transcribing audio...</p>
            </div>
        );
    }

    if (!text) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>No transcript available.</p>
            </div>
        );
    }

    return (
        <Card className="h-full border-0 shadow-none">
            <CardContent className="p-0 h-full">
                <ScrollArea className="h-[600px] w-full rounded-md border p-6 bg-muted/5">
                    <div className="prose dark:prose-invert max-w-none">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                            {text}
                        </p>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
