import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import {
    ArrowLeft,
    Calendar,
    Clock,
    User,
    Stethoscope,
    FileText,
    Hash
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { formatName } from "@/lib/formatName";

interface AppointmentDetail {
    id: string;
    doctor_id: string;
    doctor_name: string;
    doctor_specialization: string | null;
    patient_id: string;
    scheduled_at: string;
    status: string;
    reason: string;
    created_at: string | null;
    updated_at: string | null;
}

export default function AppointmentDetails() {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAppointment = async () => {
            if (!appointmentId) {
                setError("Appointment ID is missing");
                setLoading(false);
                return;
            }

            try {
                const data = await apiRequest(`/appointments/${appointmentId}`);
                setAppointment(data);
            } catch (err: any) {
                console.error("Failed to fetch appointment:", err);
                setError(err?.message || "Failed to load appointment details");
            } finally {
                setLoading(false);
            }
        };

        fetchAppointment();
    }, [appointmentId]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "SCHEDULED":
                return <Badge variant="secondary" className="text-base px-4 py-1">Scheduled</Badge>;
            case "CHECKED_IN":
                return <Badge className="bg-blue-500 text-base px-4 py-1">Checked In</Badge>;
            case "IN_PROGRESS":
                return <Badge className="bg-yellow-500 text-base px-4 py-1">In Progress</Badge>;
            case "COMPLETED":
                return <Badge className="bg-green-500 text-base px-4 py-1">Completed</Badge>;
            case "CANCELLED":
                return <Badge variant="destructive" className="text-base px-4 py-1">Cancelled</Badge>;
            default:
                return <Badge variant="outline" className="text-base px-4 py-1">{status}</Badge>;
        }
    };

    const isUpcoming = () => {
        if (!appointment) return false;
        const scheduledDate = new Date(appointment.scheduled_at);
        return scheduledDate > new Date() &&
            appointment.status !== "COMPLETED" &&
            appointment.status !== "CANCELLED";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent"></div>
                    <p className="text-muted-foreground">Loading appointment details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="p-8 text-center">
                        <p className="text-lg text-destructive mb-4">{error}</p>
                        <Button variant="outline" onClick={() => navigate("/dashboard/appointments")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Appointments
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-lg text-muted-foreground mb-4">Appointment not found</p>
                        <Button variant="outline" onClick={() => navigate("/dashboard/appointments")}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Appointments
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/dashboard/appointments")}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Appointment Details</h1>
                    <p className="text-muted-foreground">
                        {isUpcoming() ? "Upcoming appointment" : "Past appointment"}
                    </p>
                </div>
            </div>

            {/* Status Card */}
            <Card className={isUpcoming() ? "border-primary/20 bg-primary/5" : ""}>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isUpcoming() ? "bg-primary/10" : "bg-muted"
                                }`}>
                                <User className={`h-7 w-7 ${isUpcoming() ? "text-primary" : "text-muted-foreground"
                                    }`} />
                            </div>
                            <div>
                                <p className="text-xl font-semibold text-foreground">
                                    {formatName(appointment.doctor_name)}
                                </p>
                                {appointment.doctor_specialization && (
                                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                        <Stethoscope className="h-4 w-4" />
                                        <span>{appointment.doctor_specialization}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        {getStatusBadge(appointment.status)}
                    </div>
                </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Appointment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-sm text-muted-foreground">Date</p>
                                <p className="font-medium text-foreground">
                                    {format(new Date(appointment.scheduled_at), "EEEE, MMMM d, yyyy")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-sm text-muted-foreground">Time</p>
                                <p className="font-medium text-foreground">
                                    {format(new Date(appointment.scheduled_at), "h:mm a")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <p className="text-sm text-muted-foreground">Reason for Visit</p>
                            <p className="font-medium text-foreground">
                                {appointment.reason || "Not specified"}
                            </p>
                        </div>
                    </div>

                    {/* Booking Info */}
                    {appointment.created_at && (
                        <div className="pt-4 border-t border-border">
                            <p className="text-sm text-muted-foreground">
                                Booked on {format(new Date(appointment.created_at), "MMMM d, yyyy 'at' h:mm a")}
                            </p>
                        </div>
                    )}

                    {/* Appointment ID */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Hash className="h-3 w-3" />
                        <span>ID: {appointment.id}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Back Button */}
            <div className="flex justify-center pt-4">
                <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard/appointments")}
                    className="w-full sm:w-auto"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to My Appointments
                </Button>
            </div>
        </div>
    );
}
