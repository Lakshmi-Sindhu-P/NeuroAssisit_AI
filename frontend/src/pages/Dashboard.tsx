import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, FileText, Clock, Stethoscope, Brain, ArrowRight, User, CalendarPlus, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { formatName } from "@/lib/formatName";

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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Welcome Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          <span className="text-xl font-semibold text-primary">NeuroAssist</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground mt-4">
          Hello, {displayName} 👋
        </h1>
        <p className="text-muted-foreground">
          Welcome back to your health dashboard. How can we help you today?
        </p>
      </div>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <Card
              key={action.title}
              className={`transition-all hover:shadow-lg hover:-translate-y-1 ${action.primary
                ? "border-primary/30 bg-primary/5"
                : "border-border/50"
                }`}
            >
              <CardHeader className="pb-3">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${action.primary
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground"
                  }`}>
                  <action.icon className="h-7 w-7" />
                </div>
                <CardTitle className="text-xl">{action.title}</CardTitle>
                <CardDescription className="text-base">{action.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant={action.primary ? "default" : "outline"}
                  className="w-full h-11"
                >
                  <Link to={action.href} className="flex items-center gap-2">
                    {action.primary ? "Book Now" : "View Reports"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Info Widgets */}
      <section className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Appointment */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-4 pb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Upcoming Appointment</CardTitle>
              <CardDescription>Your next scheduled visit</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAppointments ? (
              <div className="flex items-center justify-center h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : upcomingAppointment ? (
              <div className="bg-accent/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{formatName(upcomingAppointment.doctor_name)}</p>
                      <p className="text-sm text-muted-foreground">Neurologist</p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {upcomingAppointment.status === "SCHEDULED" ? "Confirmed" : upcomingAppointment.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(upcomingAppointment.scheduled_at), "d MMM yyyy 'at' h:mm a")} IST
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  NeuroAssist Clinic
                </p>
              </div>
            ) : (
              <div className="bg-accent/50 rounded-xl p-6 text-center">
                <CalendarPlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground mb-1">No upcoming appointments</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Book an appointment to see your doctor
                </p>
                <Button asChild size="sm">
                  <Link to="/dashboard/book-appointment">Book Appointment</Link>
                </Button>
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/dashboard/appointments">Manage Appointments</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Last Consultation Summary */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center gap-4 pb-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/80 flex items-center justify-center">
              <Stethoscope className="h-6 w-6 text-secondary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Last Consultation</CardTitle>
              <CardDescription>Summary from your recent visit</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loadingConsultations ? (
              <div className="flex items-center justify-center h-24">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : lastConsultation ? (
              <div className="bg-accent/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">
                    {format(getConsultationDate(lastConsultation), "d MMM yyyy")}
                  </p>
                  <Badge variant="outline">Completed</Badge>
                </div>
                <p className="text-sm text-foreground font-medium">{getDoctorName(lastConsultation)}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {getConsultationSummary(lastConsultation)}
                </p>
              </div>
            ) : (
              <div className="bg-accent/50 rounded-xl p-6 text-center">
                <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground mb-1">No past consultations</p>
                <p className="text-sm text-muted-foreground">
                  Your consultation history will appear here
                </p>
              </div>
            )}
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link to="/dashboard/consultations">View All Consultations</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
