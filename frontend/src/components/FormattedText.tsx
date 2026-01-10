import { cn } from "@/lib/utils";

interface FormattedTextProps {
    text: string;
    className?: string;
}

export function FormattedText({ text, className }: FormattedTextProps) {
    if (!text) return null;

    return (
        <div className={cn("space-y-2 whitespace-pre-wrap", className)}>
            {text.split('\n').map((line, i) => (
                <p key={i} className={line.trim() === "" ? "h-2" : ""}>
                    {line}
                </p>
            ))}
        </div>
    );
}
