import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, FileText, Clock, Stethoscope, Brain, ArrowRight, User, CalendarPlus, FolderOpen, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { formatName } from "@/lib/formatName";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  doctor_name: string;
  scheduled_at: string;
  status: string;
  reason: string;
}

interface Consultation {
  id: string;
  status: string;
  notes: string;
  created_at: string;
  appointment?: {
    doctor_name: string;
    scheduled_at: string;
    reason: string;
  };
  soap_note?: {
    subjective: string;
    assessment: string;
  };
}

const quickActions = [
  {
    title: "Book Appointment",
    description: "Schedule a consultation and describe your symptoms",
    icon: Calendar,
    href: "/dashboard/book-appointment",
    primary: true,
  },
  {
    title: "View Past Reports",
    description: "Access your medical history and consultation records",
    icon: FileText,
    href: "/dashboard/consultations",
    primary: false,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = formatName(user?.firstName) || "there";
  const [upcomingAppointment, setUpcomingAppointment] = useState<Appointment | null>(null);
  const [lastConsultation, setLastConsultation] = useState<Consultation | null>(null);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingConsultations, setLoadingConsultations] = useState(true);

  useEffect(() => {
    const fetchUpcomingAppointment = async () => {
      try {
        const appointments = await apiRequest("/appointments/me");
        // Defensive: ensure appointments is an array
        if (!Array.isArray(appointments)) {
          setUpcomingAppointment(null);
          return;
        }
        const now = new Date();
        const upcoming = appointments.filter((a: Appointment) =>
          new Date(a.scheduled_at) >= now &&
          a.status !== "CANCELLED" &&
          a.status !== "COMPLETED"
        );
        upcoming.sort((a: Appointment, b: Appointment) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        );
        setUpcomingAppointment(upcoming[0] || null);
      } catch (error) {
        console.error("Failed to fetch upcoming appointment:", error);
        setUpcomingAppointment(null);
      } finally {
        setLoadingAppointments(false);
      }
    };

    const fetchLastConsultation = async () => {
      try {
        const consultations = await apiRequest("/consultations/me");
        // Defensive: ensure consultations is an array
        if (!Array.isArray(consultations)) {
          setLastConsultation(null);
          return;
        }
        // Filter for completed consultations and get the most recent
        const completed = consultations.filter((c: Consultation) => c.status === "COMPLETED");
        completed.sort((a: Consultation, b: Consultation) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLastConsultation(completed[0] || null);
      } catch (error) {
        console.error("Failed to fetch last consultation:", error);
        setLastConsultation(null);
      } finally {
        setLoadingConsultations(false);
      }
    };

    fetchUpcomingAppointment();
    fetchLastConsultation();
  }, []);

  const getConsultationDate = (consultation: Consultation): Date => {
    if (consultation.appointment?.scheduled_at) {
      return new Date(consultation.appointment.scheduled_at);
    }
    return new Date(consultation.created_at);
  };

  const getDoctorName = (consultation: Consultation): string => {
    return formatName(consultation.appointment?.doctor_name) || "Doctor";
  };

  const getConsultationSummary = (consultation: Consultation): string => {
    if (consultation.soap_note?.assessment) {
      return consultation.soap_note.assessment;
    }
    if (consultation.soap_note?.subjective) {
      return consultation.soap_note.subjective;
    }
    if (consultation.notes) {
      return consultation.notes;
    }
    return "Consultation completed.";
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-12 animate-fade-in-up">
      {/* Welcome Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl medical-gradient flex items-center justify-center shadow-sm">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-primary uppercase tracking-wider">NeuroAssist AI</h1>
            <p className="text-2xl font-bold text-foreground">
              Hello, {displayName}
            </p>
          </div>
        </div>
        <Card className="medical-gradient border-none shadow-none">
          <CardContent className="p-6">
            <p className="text-lg text-foreground/80 leading-relaxed">
              Welcome back to your health companion. Our AI-driven triage is ready to assist you with your neurological care today.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Priority Actions
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {quickActions.map((action, idx) => (
            <Card
              key={action.title}
              className={cn(
                "group overflow-hidden border-border/40 transition-all duration-300",
                action.primary
                  ? "hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                  : "hover:border-accent hover:shadow-md"
              )}
            >
              <div className={cn(
                "h-1.5 w-full",
                action.primary ? "bg-primary" : "bg-accent"
              )} />
              <CardHeader className="p-6 pb-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300",
                  action.primary
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-secondary-foreground"
                )}>
                  <action.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-bold">{action.title}</CardTitle>
                <CardDescription className="text-muted-foreground/80 leading-relaxed">
                  {action.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <Button
                  asChild
                  variant={action.primary ? "default" : "outline"}
                  className="w-full h-12 rounded-xl text-md font-semibold"
                >
                  <Link to={action.href} className="flex items-center gap-2">
                    {action.primary ? "Book Consultation" : "Access Records"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Info Widgets */}
      <section className="grid gap-8 md:grid-cols-2">
        {/* Upcoming Appointment */}
        <Card className="border-border/40 shadow-sm overflow-hidden animate-fade-in-up [animation-delay:200ms]">
          <CardHeader className="bg-muted/30 border-b border-border/40 p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Next Visit</CardTitle>
                <CardDescription>Scheduled appointment</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingAppointments ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : upcomingAppointment ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-accent/30 border border-primary/10 transition-colors hover:bg-accent/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-primary/5">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{formatName(upcomingAppointment.doctor_name)}</p>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">Neurologist</p>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-none hover:bg-primary/20 transition-colors">
                    Confirmed
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col p-4 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-xs font-semibold text-muted-foreground uppercase mb-1">Date & Time</span>
                    <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                      <Calendar className="h-4 w-4 text-primary/60" />
                      <span>{format(new Date(upcomingAppointment.scheduled_at), "d MMM, HH:mm")}</span>
                    </div>
                  </div>
                  <div className="flex flex-col p-4 rounded-xl bg-muted/20 border border-border/40">
                    <span className="text-xs font-semibold text-muted-foreground uppercase mb-1">Location</span>
                    <p className="text-sm font-bold text-foreground">Clinic Main</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/60">
                <CalendarPlus className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="font-bold text-foreground/60 mb-1">No upcoming visits</p>
                <p className="text-sm text-muted-foreground mb-6 max-w-[200px] mx-auto">
                  Take a moment to schedule your next check-up.
                </p>
                <Button asChild variant="outline" size="sm" className="rounded-full px-6">
                  <Link to="/dashboard/book-appointment">Schedule Now</Link>
                </Button>
              </div>
            )}
            <Button variant="ghost" className="w-full mt-6 text-primary hover:bg-primary/5 font-bold" asChild>
              <Link to="/dashboard/appointments" className="flex items-center justify-center gap-2">
                Manage Calendar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Last Consultation Summary */}
        <Card className="border-border/40 shadow-sm overflow-hidden animate-fade-in-up [animation-delay:400ms]">
          <CardHeader className="bg-muted/30 border-b border-border/40 p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-secondary-foreground">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Health History</CardTitle>
                <CardDescription>Insights from last visit</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingConsultations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
              </div>
            ) : lastConsultation ? (
              <div className="space-y-6">
                <div className="p-5 rounded-xl medical-gradient border border-primary/5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-foreground/80">
                      {format(getConsultationDate(lastConsultation), "MMMM d, yyyy")}
                    </p>
                    <Badge variant="outline" className="bg-white/50 border-primary/20 backdrop-blur-sm text-primary font-bold">
                      Report Ready
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" /> {getDoctorName(lastConsultation)}
                  </p>
                  <p className="text-sm text-foreground/70 leading-relaxed italic line-clamp-3">
                    "{getConsultationSummary(lastConsultation)}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center bg-muted/10 rounded-xl border border-dashed border-border/60">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="font-bold text-foreground/60 mb-1">No past history</p>
                <p className="text-sm text-muted-foreground">
                  Your medical record is empty.
                </p>
              </div>
            )}
            <Button variant="ghost" className="w-full mt-6 text-primary hover:bg-primary/5 font-bold" asChild>
              <Link to="/dashboard/consultations" className="flex items-center justify-center gap-2">
                Explore Full History <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
