import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserCog, RefreshCw } from "lucide-react";
import { formatName } from "@/lib/formatName";

interface Doctor {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    specialization: string;
    phone_number: string;
    status: "AVAILABLE" | "ON_LEAVE" | "DEACTIVATED";
}

export default function DoctorsManagement() {
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [updatingDoctorId, setUpdatingDoctorId] = useState<string | null>(null);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        specialization: "Neurologist",
        phone: "",
    });

    const fetchDoctors = async () => {
        setLoading(true);
        try {
            const data = await apiRequest("/master/doctors");
            setDoctors(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch doctors:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctors();
    }, []);

    const handleCreate = async () => {
        if (!formData.email || !formData.first_name) {
            toast({ title: "Error", description: "Email and first name are required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await apiRequest("/master/doctors", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            toast({ title: "Success", description: "Doctor created successfully" });
            setIsDialogOpen(false);
            setFormData({ email: "", password: "", first_name: "", last_name: "", specialization: "Neurologist", phone: "" });
            fetchDoctors();
        } catch (error: any) {
            console.error("Doctor creation error:", error);

            // Handle specific error cases
            let errorMessage = "Failed to create doctor";

            if (error.message) {
                if (error.message.includes("Doctor already exists")) {
                    errorMessage = "A doctor with this email already exists";
                } else if (error.message.includes("already registered with role")) {
                    errorMessage = error.message; // Show the role conflict message
                } else if (error.message.includes("CORS") || error.message.includes("Failed to fetch")) {
                    errorMessage = "Network error - please check your connection";
                    console.error("CORS or network error:", error);
                } else {
                    errorMessage = error.message;
                }
            }

            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper functions for status display
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case "AVAILABLE": return "bg-green-500/10 text-green-500 border-green-500/20";
            case "ON_LEAVE": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case "DEACTIVATED": return "bg-red-500/10 text-red-500 border-red-500/20";
            default: return "";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "AVAILABLE": return "Available";
            case "ON_LEAVE": return "On Leave";
            case "DEACTIVATED": return "Deactivated";
            default: return status;
        }
    };

    // Availability toggle (AVAILABLE <-> ON_LEAVE)
    const updateAvailability = async (doctor: Doctor, newStatus: "AVAILABLE" | "ON_LEAVE") => {
        // Prevent double-click
        if (updatingDoctorId) return;

        setUpdatingDoctorId(doctor.id);
        try {
            const response = await apiRequest(`/master/doctors/${doctor.id}/availability`, {
                method: "PATCH",
                body: JSON.stringify({ availability: newStatus }),
            });

            // Update UI only after success
            const statusLabel = newStatus === "ON_LEAVE" ? "On Leave" : "Available";
            toast({
                title: "Success",
                description: newStatus === "ON_LEAVE"
                    ? "Doctor marked as On Leave"
                    : "Doctor is now Available"
            });

            // Refetch to ensure consistency
            await fetchDoctors();
        } catch (error: any) {
            console.error("Availability update error:", error);
            const errorMessage = error.status === 403
                ? "You are not authorized"
                : (error.message || "Failed to update availability");
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setUpdatingDoctorId(null);
        }
    };

    // Deactivate/Reactivate (uses /status endpoint for INACTIVE transitions)
    const updateStatus = async (doctor: Doctor, newStatus: string) => {
        // Prevent double-click
        if (updatingDoctorId) return;

        setUpdatingDoctorId(doctor.id);
        try {
            await apiRequest(`/master/doctors/${doctor.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status: newStatus }),
            });

            toast({
                title: "Success",
                description: `Doctor ${newStatus === "INACTIVE" ? "deactivated" : "reactivated"} successfully`
            });

            await fetchDoctors();
        } catch (error: any) {
            console.error("Status update error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to update status",
                variant: "destructive"
            });
        } finally {
            setUpdatingDoctorId(null);
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Doctors Management</h1>
                    <p className="text-muted-foreground">Create and manage doctor accounts</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchDoctors}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add Doctor
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Doctor Account</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>First Name</Label>
                                        <Input
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label>Last Name</Label>
                                        <Input
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Temporary Password</Label>
                                    <Input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Leave empty for default"
                                    />
                                </div>
                                <div>
                                    <Label>Specialization</Label>
                                    <Input
                                        value={formData.specialization}
                                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Phone</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={isSubmitting}>
                                    {isSubmitting ? "Creating..." : "Create Doctor"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Specialization</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : doctors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No doctors found. Click "Add Doctor" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                doctors.map((doctor) => (
                                    <TableRow key={doctor.id}>
                                        <TableCell className="font-medium">
                                            {formatName(`${doctor.first_name || ""} ${doctor.last_name || ""}`.trim()) || "N/A"}
                                        </TableCell>
                                        <TableCell>{doctor.email}</TableCell>
                                        <TableCell>{doctor.specialization || "N/A"}</TableCell>
                                        <TableCell>{doctor.phone_number || "N/A"}</TableCell>
                                        <TableCell>
                                            <Badge
                                                className={getStatusBadgeClass(doctor.status)}
                                                variant="outline"
                                            >
                                                {getStatusLabel(doctor.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {doctor.status === "AVAILABLE" && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={updatingDoctorId === doctor.id}
                                                            onClick={() => updateAvailability(doctor, "ON_LEAVE")}
                                                        >
                                                            {updatingDoctorId === doctor.id ? "Updating..." : "Mark On Leave"}
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={updatingDoctorId === doctor.id}
                                                            onClick={() => updateStatus(doctor, "DEACTIVATED")}
                                                        >
                                                            Deactivate Account
                                                        </Button>
                                                    </>
                                                )}
                                                {doctor.status === "ON_LEAVE" && (
                                                    <>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            disabled={updatingDoctorId === doctor.id}
                                                            onClick={() => updateAvailability(doctor, "AVAILABLE")}
                                                        >
                                                            {updatingDoctorId === doctor.id ? "Updating..." : "Mark Available"}
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={updatingDoctorId === doctor.id}
                                                            onClick={() => updateStatus(doctor, "DEACTIVATED")}
                                                        >
                                                            Deactivate Account
                                                        </Button>
                                                    </>
                                                )}
                                                {doctor.status === "DEACTIVATED" && (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        disabled={updatingDoctorId === doctor.id}
                                                        onClick={() => updateStatus(doctor, "AVAILABLE")}
                                                    >
                                                        {updatingDoctorId === doctor.id ? "Updating..." : "Reactivate"}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
