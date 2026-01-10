import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { History, ChevronDown, Sparkles, FileText } from "lucide-react";
import { useState } from "react";
import { FormattedText } from "@/components/FormattedText";

interface PreConsultationBriefProps {
    patient: any;
    intakeSummary?: string;
    intakeTranscript?: string;
    appointmentReason?: string;
}

export function PreConsultationBrief({ patient, intakeSummary, intakeTranscript, appointmentReason }: PreConsultationBriefProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (!patient) return null;

    return (
        <Card className="border-primary/20 bg-primary/5 shadow-md">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl text-primary">
                    <Sparkles className="h-5 w-5" />
                    Pre-Consultation Brief
                </CardTitle>
                <CardDescription className="text-primary/70">
                    Clinical context prepared by AI from patient intake.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Intake Summary Section */}
                {intakeSummary && (
                    <div className="bg-white/60 dark:bg-slate-900/40 p-4 rounded-xl border border-primary/10 animate-in fade-in duration-500">
                        <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary mb-3">
                            <Sparkles className="h-4 w-4" />
                            AI Intake Summary
                        </h4>
                        <p className="text-base leading-relaxed font-medium text-slate-800 dark:text-slate-200">
                            {intakeSummary}
                        </p>
                    </div>
                )}

                {/* Patient Context Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Age / Gender</p>
                        <p className="text-lg font-semibold">{patient.age || 'N/A'}y / {patient.gender || patient.gender_identity || 'N/A'}</p>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest truncate">Reason for Visit</p>
                        <p className="text-lg font-semibold truncate" title={appointmentReason || "Checks ups"}>{appointmentReason || 'Routine Checkup'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Medical History</p>
                        <p className="text-lg font-semibold truncate" title={patient.medical_history}>{patient.medical_history || 'None'}</p>
                    </div>
                </div>

                {/* Collapsible Transcript */}
                {intakeTranscript && (
                    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="pt-2 border-t border-primary/10">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Full Intake Transcript
                            </h4>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 gap-2">
                                    {isOpen ? 'Minimize' : 'View Full Transcript'}
                                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                </Button>
                            </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent className="mt-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="p-4 bg-muted/30 rounded-lg text-sm leading-relaxed max-h-60 overflow-y-auto border border-muted ring-1 ring-black/5">
                                <FormattedText text={intakeTranscript} />
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )}
            </CardContent>
        </Card>
    );
}
