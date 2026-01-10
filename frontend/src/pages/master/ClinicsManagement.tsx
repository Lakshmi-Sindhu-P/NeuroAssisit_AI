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
import { Building2, RefreshCw, Plus } from "lucide-react";

interface Clinic {
    id: string;
    name: string;
    location: string;
    is_active: boolean;
    created_at: string;
}

export default function ClinicsManagement() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        name: "",
        location: "",
    });

    const fetchClinics = async () => {
        setLoading(true);
        try {
            const data = await apiRequest("/master/clinics");
            setClinics(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch clinics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClinics();
    }, []);

    const handleCreate = async () => {
        if (!formData.name) {
            toast({ title: "Error", description: "Clinic name is required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await apiRequest("/master/clinics", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            toast({ title: "Success", description: "Clinic created successfully" });
            setIsDialogOpen(false);
            setFormData({ name: "", location: "" });
            fetchClinics();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to create clinic", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleStatus = async (clinic: Clinic) => {
        try {
            await apiRequest(`/master/clinics/${clinic.id}`, {
                method: "PATCH",
                body: JSON.stringify({ is_active: !clinic.is_active }),
            });
            toast({ title: "Success", description: `Clinic ${!clinic.is_active ? "activated" : "deactivated"}` });
            fetchClinics();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Clinics / Departments</h1>
                    <p className="text-muted-foreground">Manage clinics and departments</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchClinics}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Clinic
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Clinic</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label>Clinic Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Neurology Department"
                                    />
                                </div>
                                <div>
                                    <Label>Location</Label>
                                    <Input
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="e.g., Building A, Floor 2"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={isSubmitting}>
                                    {isSubmitting ? "Creating..." : "Create Clinic"}
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
                                <TableHead>Location</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : clinics.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No clinics found. Click "Add Clinic" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                clinics.map((clinic) => (
                                    <TableRow key={clinic.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                                {clinic.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{clinic.location || "N/A"}</TableCell>
                                        <TableCell>
                                            {clinic.created_at ? new Date(clinic.created_at).toLocaleDateString() : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={clinic.is_active ? "default" : "secondary"}>
                                                {clinic.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleStatus(clinic)}
                                            >
                                                {clinic.is_active ? "Deactivate" : "Activate"}
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
