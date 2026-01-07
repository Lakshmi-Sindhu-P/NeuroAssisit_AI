import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, History, Pill } from "lucide-react";

interface PreConsultationProps {
    medications: string[];
    allergies: string[];
    medicalHistory?: string;
}

export function PreConsultationBrief({ medications, allergies, medicalHistory }: PreConsultationProps) {
    if (!medications?.length && !allergies?.length) return null;

    return (
        <Card className="mb-6 bg-slate-50 border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Patient Medical Snapshot
                </CardTitle>
                <CardDescription>Known history from patient records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Medications */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1">
                            <Pill className="w-3 h-3" /> Current Medications
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {medications && medications.length > 0 ? (
                                medications.map((med, i) => (
                                    <Badge key={i} variant="outline" className="bg-white px-3 py-1 text-sm font-medium border-slate-300">
                                        {med}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-sm text-muted-foreground italic">No known active medications.</span>
                            )}
                        </div>
                    </div>

                    {/* Allergies */}
                    <div className="space-y-2">
                        <label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1 text-red-700">
                            <AlertCircle className="w-3 h-3" /> Allergies
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {allergies && allergies.length > 0 ? (
                                allergies.map((allergy, i) => (
                                    <Badge key={i} variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200 px-3 py-1 text-sm font-medium">
                                        {allergy}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-sm text-green-600 italic">No known allergies.</span>
                            )}
                        </div>
                    </div>
                </div>

                {medicalHistory && (
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                        <label className="text-xs uppercase font-bold text-muted-foreground">Previous History</label>
                        <p className="text-sm text-slate-700 leading-relaxed">{medicalHistory}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
