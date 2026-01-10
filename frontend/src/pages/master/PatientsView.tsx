import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { RefreshCw, UserPlus, Copy, Check } from "lucide-react";
import { formatName } from "@/lib/formatName";

interface Patient {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    is_active: boolean;
    created_at: string;
}

export default function PatientsView() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdPatient, setCreatedPatient] = useState<{ email: string; password: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        phone: "",
        gender: "",
    });

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const data = await apiRequest("/master/patients");
            setPatients(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch patients:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handleCreate = async () => {
        if (!formData.email || !formData.full_name) {
            toast({ title: "Error", description: "Email and full name are required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiRequest("/master/patients", {
                method: "POST",
                body: JSON.stringify(formData),
            });

            // Show success with temporary password
            setCreatedPatient({
                email: response.email,
                password: response.temporary_password
            });

            toast({ title: "Success", description: "Patient account created successfully" });
            setFormData({ full_name: "", email: "", phone: "", gender: "" });
            fetchPatients();
        } catch (error: any) {
            if (error.message?.includes("409") || error.message?.includes("exists")) {
                toast({ title: "Error", description: "Email already exists", variant: "destructive" });
            } else {
                toast({ title: "Error", description: error.message || "Failed to create patient", variant: "destructive" });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyCredentials = () => {
        if (createdPatient) {
            navigator.clipboard.writeText(`Email: ${createdPatient.email}\nPassword: ${createdPatient.password}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setCreatedPatient(null);
        setCopied(false);
    };

    const toggleStatus = async (patient: Patient) => {
        try {
            await apiRequest(`/master/patients/${patient.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ is_active: !patient.is_active }),
            });
            toast({ title: "Success", description: `Patient ${!patient.is_active ? "activated" : "deactivated"}` });
            fetchPatients();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Patients Management</h1>
                    <p className="text-muted-foreground">View and manage patient accounts</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchPatients}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            setCreatedPatient(null);
                            setCopied(false);
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add Patient
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {createdPatient ? "Patient Created!" : "Create Patient Account"}
                                </DialogTitle>
                            </DialogHeader>

                            {createdPatient ? (
                                <div className="space-y-4 py-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <p className="text-green-800 font-medium mb-2">Account created successfully!</p>
                                        <p className="text-sm text-green-700">Share these credentials with the patient:</p>
                                    </div>
                                    <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-2">
                                        <div><span className="text-muted-foreground">Email:</span> {createdPatient.email}</div>
                                        <div><span className="text-muted-foreground">Password:</span> {createdPatient.password}</div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={copyCredentials}
                                    >
                                        {copied ? (
                                            <><Check className="w-4 h-4 mr-2" /> Copied!</>
                                        ) : (
                                            <><Copy className="w-4 h-4 mr-2" /> Copy Credentials</>
                                        )}
                                    </Button>
                                    <DialogFooter>
                                        <Button onClick={closeDialog}>Done</Button>
                                    </DialogFooter>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-4 py-4">
                                        <div>
                                            <Label>Full Name *</Label>
                                            <Input
                                                placeholder="John Doe"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Email *</Label>
                                            <Input
                                                type="email"
                                                placeholder="patient@example.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Phone</Label>
                                            <Input
                                                placeholder="+91 9876543210"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label>Gender</Label>
                                            <select
                                                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                                value={formData.gender}
                                                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            >
                                                <option value="">Select gender</option>
                                                <option value="MALE">Male</option>
                                                <option value="FEMALE">Female</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            A temporary password will be auto-generated. Share it with the patient.
                                        </p>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleCreate} disabled={isSubmitting}>
                                            {isSubmitting ? "Creating..." : "Create Patient"}
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
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
                                <TableHead>Phone</TableHead>
                                <TableHead>Registered</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : patients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No patients found. Click "Add Patient" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                patients.map((patient) => (
                                    <TableRow key={patient.id}>
                                        <TableCell className="font-medium">
                                            {formatName(`${patient.first_name || ""} ${patient.last_name || ""}`.trim()) || "N/A"}
                                        </TableCell>
                                        <TableCell>{patient.email}</TableCell>
                                        <TableCell>{patient.phone_number || "N/A"}</TableCell>
                                        <TableCell>
                                            {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={patient.is_active ? "default" : "secondary"}
                                                className={patient.is_active
                                                    ? "bg-green-500/15 text-green-600"
                                                    : "bg-gray-500/15 text-gray-600"
                                                }
                                            >
                                                {patient.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant={patient.is_active ? "destructive" : "default"}
                                                size="sm"
                                                onClick={() => toggleStatus(patient)}
                                            >
                                                {patient.is_active ? "Disable" : "Enable"}
                                            </Button>
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
