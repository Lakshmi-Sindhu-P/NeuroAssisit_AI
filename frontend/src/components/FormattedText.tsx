import React from 'react';

interface FormattedTextProps {
    text: string;
    className?: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "" }) => {
    if (!text) return null;

    // Helper to process inline styles like **bold**
    const processInlineStyles = (line: string) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-semibold text-foreground/90">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    // Split text into lines
    const lines = text.split('\n');
    const renderedLines: React.ReactNode[] = [];

    let currentList: React.ReactNode[] = [];
    let isOrderedList = false;

    lines.forEach((line, index) => {
        const trimmed = line.trim();

        // Handle Bullet Lists (* or -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            if (isOrderedList && currentList.length > 0) {
                renderedLines.push(<ol key={`ol-${index}`} className="list-decimal list-inside pl-4 mb-2 space-y-1">{currentList}</ol>);
                currentList = [];
                isOrderedList = false;
            }
            currentList.push(<li key={`li-${index}`}>{processInlineStyles(trimmed.substring(2))}</li>);
        }
        // Handle Numbered Lists (1. )
        else if (/^\d+\.\s/.test(trimmed)) {
            if (!isOrderedList && currentList.length > 0) {
                renderedLines.push(<ul key={`ul-${index}`} className="list-disc list-inside pl-4 mb-2 space-y-1">{currentList}</ul>);
                currentList = [];
            }
            isOrderedList = true;
            // Remove the number prefix for clean rendering or keep it? 
            // Better to let <ol> handle numbering, so remove "1. "
            const content = trimmed.replace(/^\d+\.\s/, '');
            currentList.push(<li key={`li-${index}`}>{processInlineStyles(content)}</li>);
        }
        else {
            // Flush any open list
            if (currentList.length > 0) {
                if (isOrderedList) {
                    renderedLines.push(<ol key={`ol-${index}`} className="list-decimal list-inside pl-4 mb-2 space-y-1">{currentList}</ol>);
                } else {
                    renderedLines.push(<ul key={`ul-${index}`} className="list-disc list-inside pl-4 mb-2 space-y-1">{currentList}</ul>);
                }
                currentList = [];
                isOrderedList = false;
            }

            // Normal text line
            if (trimmed.length > 0) {
                renderedLines.push(
                    <p key={index} className="mb-1 leading-relaxed">
                        {processInlineStyles(trimmed)}
                    </p>
                );
            } else {
                renderedLines.push(<br key={index} />);
            }
        }
    });

    // Flush any remaining list at the end
    if (currentList.length > 0) {
        if (isOrderedList) {
            renderedLines.push(<ol key="ol-end" className="list-decimal list-inside pl-4 mb-2 space-y-1">{currentList}</ol>);
        } else {
            renderedLines.push(<ul key="ul-end" className="list-disc list-inside pl-4 mb-2 space-y-1">{currentList}</ul>);
        }
    }

    return <div className={`text-sm ${className}`}>{renderedLines}</div>;
};
