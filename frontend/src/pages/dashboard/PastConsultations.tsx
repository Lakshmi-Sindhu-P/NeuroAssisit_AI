import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, CheckCircle2, Clock, Play, Pause, FileText, Brain, ChevronRight, User, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { formatName } from "@/lib/formatName";

interface Consultation {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: string;
  notes: string;
  created_at: string;
  appointment?: {
    id: string;
    doctor_name: string;
    scheduled_at: string;
    reason: string;
  };
  audio_file?: {
    id: string;
    file_name: string;
  };
  soap_note?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
}

export default function PastConsultations() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const data = await apiRequest("/consultations/me");
        // Defensive: ensure data is an array
        if (!Array.isArray(data)) {
          setConsultations([]);
          return;
        }
        // Filter for completed/past consultations and sort by date DESC
        const pastConsultations = data.filter(
          (c: Consultation) => c.status === "COMPLETED" || c.status === "IN_PROGRESS"
        );
        pastConsultations.sort((a: Consultation, b: Consultation) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setConsultations(pastConsultations);
      } catch (error) {
        console.error("Failed to fetch consultations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConsultations();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDoctorName = (consultation: Consultation): string => {
    if (consultation.appointment?.doctor_name) {
      return formatName(consultation.appointment.doctor_name);
    }
    return "Doctor";
  };

  const getConsultationDate = (consultation: Consultation): Date => {
    if (consultation.appointment?.scheduled_at) {
      return new Date(consultation.appointment.scheduled_at);
    }
    return new Date(consultation.created_at);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Past Consultations</h1>
          <p className="text-muted-foreground">View your consultation history</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Past Consultations</h1>
        <p className="text-muted-foreground">
          View your neurology consultation history
        </p>
      </div>

      {/* Consultations List */}
      {consultations.length > 0 ? (
        <div className="space-y-4">
          {consultations.map((consultation) => (
            <Card
              key={consultation.id}
              className="border-border/50 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedConsultation(consultation)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Doctor Icon */}
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-7 w-7 text-primary" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">
                        {getDoctorName(consultation)}
                      </h3>
                      {getStatusBadge(consultation.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">Neurologist</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(getConsultationDate(consultation), "d MMM yyyy")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(getConsultationDate(consultation), "h:mm a")} IST
                      </span>
                      {consultation.audio_file && (
                        <Badge variant="outline" className="text-xs">
                          <Play className="h-3 w-3 mr-1" /> Recording
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No past consultations yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your consultation history will appear here after you complete your first appointment.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedConsultation} onOpenChange={() => setSelectedConsultation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          {selectedConsultation && (
            <>
              <DialogHeader className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{getDoctorName(selectedConsultation)}</DialogTitle>
                    <DialogDescription className="mt-1">
                      Neurologist • {format(getConsultationDate(selectedConsultation), "d MMMM yyyy 'at' h:mm a")} IST
                    </DialogDescription>
                    {getStatusBadge(selectedConsultation.status)}
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh]">
                <div className="px-6 pb-6 space-y-6">
                  {/* Symptoms / Notes */}
                  {(selectedConsultation.notes || selectedConsultation.appointment?.reason) && (
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2 text-foreground">
                        <FileText className="h-4 w-4 text-primary" />
                        Reported Symptoms
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {selectedConsultation.notes || selectedConsultation.appointment?.reason}
                      </p>
                    </div>
                  )}

                  {/* Audio Playback */}
                  {selectedConsultation.audio_file && (
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2 text-foreground">
                        <Play className="h-4 w-4 text-primary" />
                        Consultation Recording
                      </h4>
                      <Card className="border-border/50 bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Button
                              size="icon"
                              variant={isPlaying ? "secondary" : "default"}
                              className="w-12 h-12 rounded-full shrink-0"
                              onClick={togglePlayback}
                            >
                              {isPlaying ? (
                                <Pause className="h-5 w-5" />
                              ) : (
                                <Play className="h-5 w-5 ml-0.5" />
                              )}
                            </Button>
                            <div className="flex-1 space-y-2">
                              <Slider
                                value={[audioProgress]}
                                onValueChange={([value]) => setAudioProgress(value)}
                                max={100}
                                step={1}
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground">
                                {selectedConsultation.audio_file.file_name}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  <Separator />

                  {/* SOAP Note */}
                  {selectedConsultation.soap_note && (
                    <>
                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-foreground">
                          <Brain className="h-4 w-4 text-primary" />
                          AI-Generated Summary
                        </h4>
                        <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="p-4 space-y-3">
                            {selectedConsultation.soap_note.subjective && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Subjective</p>
                                <p className="text-sm text-foreground">{selectedConsultation.soap_note.subjective}</p>
                              </div>
                            )}
                            {selectedConsultation.soap_note.assessment && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Assessment</p>
                                <p className="text-sm text-foreground">{selectedConsultation.soap_note.assessment}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-semibold flex items-center gap-2 text-foreground">
                          <FileText className="h-4 w-4 text-primary" />
                          Doctor's Notes & Plan
                        </h4>
                        <Card className="border-border/50">
                          <CardContent className="p-4 space-y-3">
                            {selectedConsultation.soap_note.objective && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Objective</p>
                                <p className="text-sm text-foreground">{selectedConsultation.soap_note.objective}</p>
                              </div>
                            )}
                            {selectedConsultation.soap_note.plan && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Plan</p>
                                <p className="text-sm text-foreground">{selectedConsultation.soap_note.plan}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* No notes yet message */}
                  {!selectedConsultation.soap_note && selectedConsultation.status !== "COMPLETED" && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Consultation in progress</p>
                      <p className="text-sm">Notes will be available after the consultation is completed.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
