import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, Clock, User, ArrowRight, Plus, CalendarPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { formatName } from "@/lib/formatName";

interface Appointment {
    id: string;
    doctor_name: string;
    doctor_id: string;
    scheduled_at: string;
    status: string;
    reason: string;
}

export default function MyAppointments() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const data = await apiRequest("/appointments/me");
                // Defensive: ensure data is an array
                setAppointments(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch appointments:", error);
                setAppointments([]);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SCHEDULED":
                return <Badge variant="secondary">Scheduled</Badge>;
            case "CHECKED_IN":
                return <Badge className="bg-blue-500">Checked In</Badge>;
            case "IN_PROGRESS":
                return <Badge className="bg-yellow-500">In Progress</Badge>;
            case "COMPLETED":
                return <Badge className="bg-green-500">Completed</Badge>;
            case "CANCELLED":
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Separate upcoming and past appointments
    const now = new Date();
    const upcomingAppointments = appointments.filter(
        (a) => new Date(a.scheduled_at) >= now && a.status !== "CANCELLED" && a.status !== "COMPLETED"
    );
    const pastAppointments = appointments.filter(
        (a) => new Date(a.scheduled_at) < now || a.status === "COMPLETED" || a.status === "CANCELLED"
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">My Appointments</h1>
                    <p className="text-muted-foreground mt-1">View and manage your scheduled appointments</p>
                </div>
                <Button asChild>
                    <Link to="/dashboard/book-appointment" className="flex items-center gap-2">
                        <CalendarPlus className="h-4 w-4" />
                        Book New Appointment
                    </Link>
                </Button>
            </div>

            {/* Upcoming Appointments */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Upcoming Appointments
                </h2>
                {upcomingAppointments.length > 0 ? (
                    <div className="grid gap-4">
                        {upcomingAppointments.map((appointment) => (
                            <Card
                                key={appointment.id}
                                className="border-primary/20 bg-primary/5 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => navigate(`/dashboard/appointments/${appointment.id}`)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-6 w-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground">{formatName(appointment.doctor_name)}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        {format(new Date(appointment.scheduled_at), "d MMM yyyy 'at' h:mm a")}
                                                    </span>
                                                </div>
                                                {appointment.reason && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Reason: {appointment.reason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(appointment.status)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="p-8 text-center">
                            <CalendarPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-medium text-foreground mb-2">No upcoming appointments</p>
                            <p className="text-muted-foreground mb-4">Book an appointment to see your doctor.</p>
                            <Button asChild>
                                <Link to="/dashboard/book-appointment">Book Appointment</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </section>

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        Past Appointments
                    </h2>
                    <div className="grid gap-4">
                        {pastAppointments.map((appointment) => (
                            <Card
                                key={appointment.id}
                                className="border-border/50 cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => navigate(`/dashboard/appointments/${appointment.id}`)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                                <User className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{formatName(appointment.doctor_name)}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        {format(new Date(appointment.scheduled_at), "d MMM yyyy 'at' h:mm a")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {getStatusBadge(appointment.status)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
