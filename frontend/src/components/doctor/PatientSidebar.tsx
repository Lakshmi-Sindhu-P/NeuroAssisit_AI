import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Calendar, Activity, Phone, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PatientSidebarProps {
    patientId: string | null;
}

interface PatientProfile {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    medical_history: string;
    phone_number: string;
}

export function PatientSidebar({ patientId }: PatientSidebarProps) {
    const [profile, setProfile] = useState<PatientProfile | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (patientId) {
            setLoading(true);
            api.get(`/users/patients/${patientId}`)
                .then(res => setProfile(res.data))
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setProfile(null);
        }
    }, [patientId]);

    if (!patientId) return null;

    if (loading) {
        return <div className="space-y-4 p-4"><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-20 w-full" /></div>;
    }

    if (!profile) return null;

    // Parse medical history if it looks like a list or JSON, otherwise display text
    // Assuming simple text for now based on backend model
    const historyItems = profile.medical_history ? profile.medical_history.split('\n').filter(Boolean) : [];

    return (
        <Card className="h-full border-l rounded-none shadow-sm bg-slate-50/50">
            <CardHeader className="pb-4 border-b bg-white">
                <div className="flex flex-col items-center text-center space-y-2">
                    <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.first_name}`} />
                        <AvatarFallback>{profile.first_name[0]}{profile.last_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-lg">{profile.first_name} {profile.last_name}</CardTitle>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-2">
                            <Calendar className="w-3 h-3" /> {new Date(profile.date_of_birth).toLocaleDateString()}
                            <span className="mx-1">•</span>
                            <span>{profile.gender || "N/A"}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-250px)]">

                {/* Contact Info (if needed) */}
                <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Contact</h4>
                    <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{profile.phone_number || "No phone"}</span>
                    </div>
                </div>

                <Separator />

                {/* Medical History */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-red-500" />
                        <h4 className="text-sm font-semibold text-slate-800">Medical History</h4>
                    </div>

                    {historyItems.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {historyItems.map((item, i) => (
                                <Badge key={i} variant="secondary" className="bg-white border text-slate-600 font-normal">
                                    {item}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No history recorded.</p>
                    )}
                </div>

                {/* Allergies - Placeholder if data not separate */}
                {/* <Separator />
                <div className="space-y-3">
                     <h4 className="text-sm font-semibold text-slate-800">Allergies</h4>
                     <p className="text-sm text-slate-600">NKDA</p>
                </div> */}

            </CardContent>
        </Card>
    );
}
