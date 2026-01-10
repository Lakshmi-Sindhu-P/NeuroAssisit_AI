import { useState, useEffect } from "react";
import api, { apiRequest } from "@/lib/api";
import { formatName } from "@/lib/formatName";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityChip } from "@/components/PriorityChip";
import { WaitTimer } from "@/components/WaitTimer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    Users,
    AlertTriangle,
    CheckCircle,
    User,
    Calendar,
    Stethoscope,
    Phone,
    X,
    Loader2,
    Clock,
    Search
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface TriagePatient {
    id: string;
    appointment_id: string;
    patient_id: string;
    name: string;
    triageScore: number;
    triageCategory: string;
    triageReason: string | null;
    status: string;
    scheduledAt: string;
    assignedDoctor: string | null;
    checkInTime: Date;
    waitTime: number;
}

export default function PatientQueue() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [patients, setPatients] = useState<TriagePatient[]>([]);
    const [filteredPatients, setFilteredPatients] = useState<TriagePatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchData();
        // Poll every 15s
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredPatients(patients);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredPatients(patients.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.patient_id.toLowerCase().includes(query)
            ));
        }
    }, [searchQuery, patients]);

    async function fetchData() {
        try {
            // Reusing admin endpoint for now as it gives the full triage list
            const queueData = await apiRequest("/admin/triage_queue");
            const mappedQueue = queueData.map((p: any) => ({
                ...p,
                checkInTime: new Date(p.checkInTime)
            }));
            setPatients(mappedQueue);
        } catch (error) {
            console.error("Failed to load queue", error);
        } finally {
            setIsLoading(false);
        }
    }

    const handlePatientSelect = async (patient: TriagePatient) => {
        try {
            // Get or Create Consultation Record
            // This ensures we have a valid Consultation ID (not Appointment ID) for uploads
            const res = await api.post("/consultations/", {
                appointment_id: patient.appointment_id,
                notes: "" // Optional init
            });

            const consultationId = res.data.id;

            navigate(`/doctor/dashboard?consultationId=${consultationId}&patientName=${encodeURIComponent(patient.name)}`);
        } catch (error) {
            console.error("Failed to start consultation", error);
            toast({
                title: "Error",
                description: "Failed to initialize consultation record.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="h-full space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end px-1">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" /> Patient Queue
                    </h2>
                    <p className="text-muted-foreground mt-1">Live triage list. Select a patient to begin consultation.</p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search patient name or ID..."
                        className="pl-9 bg-background/50 border-border/50 focus:bg-background transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Main Queue Table */}
            <Card className="border-border/40 shadow-sm overflow-hidden glass-card">
                <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                            Live Queue Status
                        </CardTitle>
                        <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-primary/20 text-primary font-bold">
                            {filteredPatients.length} Patients Waiting
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/10 hover:bg-muted/10 border-none">
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Priority</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Patient</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Status</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Wait Time</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPatients.length > 0 ? (
                                    filteredPatients.map((patient) => (
                                        <TableRow
                                            key={patient.id}
                                            className="hover:bg-accent/40 transition-all border-b border-border/40 cursor-pointer group"
                                            onClick={() => handlePatientSelect(patient)}
                                        >
                                            <TableCell className="px-6 py-4">
                                                <PriorityChip
                                                    triageCategory={patient.triageCategory}
                                                    triageScore={patient.triageScore}
                                                    className="shadow-none group-hover:scale-105 transition-transform"
                                                />
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <p className="font-bold text-foreground group-hover:text-primary transition-colors">{formatName(patient.name)}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">ID: {patient.patient_id.slice(0, 8)}</p>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                                                    patient.status === 'CHECKED_IN' ? 'bg-green-50 border-green-200 text-green-700' :
                                                        patient.status === 'SCHEDULED' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                                            patient.status === 'IN_PROGRESS' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                                                                'bg-muted border-border text-muted-foreground'
                                                )}>
                                                    {patient.status.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-2 font-semibold text-sm">
                                                    <Clock className="h-3.5 w-3.5 text-primary/60" />
                                                    <WaitTimer checkInTime={patient.checkInTime} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Consult <Stethoscope className="h-3 w-3 ml-2" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center text-muted-foreground/40 space-y-4">
                                                <div className="w-20 h-20 rounded-full medical-gradient/10 flex items-center justify-center border-2 border-dashed border-primary/20">
                                                    <Users className="h-10 w-10 text-primary/30" />
                                                </div>
                                                <p className="text-lg font-bold text-foreground/60">No patients found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
