import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { formatName } from "@/lib/formatName";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityChip } from "@/components/PriorityChip";
import { WaitTimer } from "@/components/WaitTimer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Users, AlertTriangle, CheckCircle, User, Calendar, Stethoscope, Phone, X, Loader2 } from "lucide-react";

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



interface TriagePatient {
  id: string;
  appointment_id: string;
  patient_id: string;
  name: string;
  triageScore: number;
  triageCategory: string; // CRITICAL, HIGH, MODERATE, LOW
  triageReason: string | null;
  status: string;
  scheduledAt: string;
  assignedDoctor: string | null;
  checkInTime: Date;
  waitTime: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<TriagePatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<TriagePatient | null>(null);


  // Patient Details Modal State
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [patientSummary, setPatientSummary] = useState<{
    patient: { name: string; age: number | null; gender: string | null; phone: string | null };
    appointment: { id: string; scheduled_at: string | null; status: string; reason: string | null };
    triage: { category: string; source: string | null };
    doctor: { name: string | null; specialization: string | null };
  } | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const queueData = await apiRequest("/admin/triage_queue");
        const mappedQueue = queueData.map((p: any) => ({
          ...p,
          checkInTime: new Date(p.checkInTime)
        }));
        setPatients(mappedQueue);


      } catch (error) {
        toast({
          title: "Error fetching data",
          description: "Failed to load triage queue or doctors",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    // Refresh every 10 seconds (MVP polling)
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Count based on triageCategory from backend
  const criticalCount = patients.filter(p => p.triageCategory === "CRITICAL").length;
  const highCount = patients.filter(p => p.triageCategory === "HIGH").length;
  const stableCount = patients.filter(p => p.triageCategory === "MODERATE" || p.triageCategory === "LOW").length;
  const totalPatients = patients.length;



  // Privacy-safe patient details popup
  const handleViewDetails = async (patient: TriagePatient) => {
    setSelectedPatient(patient);
    setIsLoadingSummary(true);
    setDetailsDialogOpen(true);
    setPatientSummary(null);

    try {
      const summary = await apiRequest(`/admin/queue/${patient.appointment_id}/summary`);
      setPatientSummary(summary);
    } catch (error: any) {
      toast({
        title: "Failed to load details",
        description: error.message || "Could not fetch patient summary",
        variant: "destructive"
      });
      setDetailsDialogOpen(false);
    } finally {
      setIsLoadingSummary(false);
    }
  };



  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="medical-gradient border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group">
          <CardContent className="flex items-center gap-5 p-6">
            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Total in Queue</p>
              <p className="text-3xl font-bold text-foreground">{totalPatients}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-destructive/5 border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group">
          <CardContent className="flex items-center gap-5 p-6">
            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <p className="text-xs font-bold text-destructive uppercase tracking-wider">Critical Cases</p>
              <p className="text-3xl font-bold text-foreground">{criticalCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group">
          <CardContent className="flex items-center gap-5 p-6">
            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Stable Cases</p>
              <p className="text-3xl font-bold text-foreground">{stableCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Triage Queue Table */}
      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg medical-gradient flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              Live Triage Queue
            </CardTitle>
            <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-primary/20 text-primary font-bold">
              {totalPatients} Active Patients
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10 border-none">
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Priority</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Patient</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Wait Time</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-4 px-6">Assigned Doctor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="hover:bg-accent/40 transition-all border-b border-border/40 cursor-pointer group"
                    onClick={() => handleViewDetails(patient)}
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
                      {patient.assignedDoctor ? (
                        <div className="flex items-center gap-2 p-1.5 px-3 rounded-lg bg-accent/30 border border-primary/5 w-fit">
                          <User className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-bold text-foreground">{patient.assignedDoctor}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic font-medium px-3">Pending assignment...</span>
                      )}
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
                      <div>
                        <p className="text-lg font-bold text-foreground/60">Queue is Clear</p>
                        <p className="text-sm max-w-xs mx-auto">No patients are currently waiting in the triage queue.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>






      {/* Patient Details Modal (Privacy-Safe) */}
      < Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen} >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Patient & Appointment Details
            </DialogTitle>
            <DialogDescription>Read-only summary for queue management</DialogDescription>
          </DialogHeader>

          {isLoadingSummary ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : patientSummary ? (
            <div className="space-y-4 py-4">
              {/* Patient Info */}
              <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <User className="h-4 w-4" /> Patient Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{formatName(patientSummary.patient.name)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Age:</span>
                    <p className="font-medium">{patientSummary.patient.age || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender:</span>
                    <p className="font-medium">{patientSummary.patient.gender || "N/A"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{patientSummary.patient.phone || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Appointment Info */}
              <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Appointment
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Scheduled:</span>
                    <p className="font-medium">
                      {patientSummary.appointment.scheduled_at
                        ? new Date(patientSummary.appointment.scheduled_at).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium">{patientSummary.appointment.status.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>

              {/* Triage Status */}
              <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Triage Status
                </h4>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${patientSummary.triage.category === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    patientSummary.triage.category === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      patientSummary.triage.category === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                    }`}>
                    {patientSummary.triage.category}
                  </span>
                  {patientSummary.triage.source && (
                    <span className="text-xs text-muted-foreground">Source: {patientSummary.triage.source}</span>
                  )}
                </div>
              </div>

              {/* Assigned Doctor */}
              <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" /> Assigned Doctor
                </h4>
                <div className="text-sm">
                  <p className="font-medium">{patientSummary.doctor.name || "Not assigned"}</p>
                  {patientSummary.doctor.specialization && (
                    <p className="text-muted-foreground">{patientSummary.doctor.specialization}</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
