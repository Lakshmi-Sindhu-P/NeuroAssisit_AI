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
import { UserPlus, RefreshCw } from "lucide-react";
import { formatName } from "@/lib/formatName";

interface FrontDeskStaff {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    status: "ACTIVE" | "INACTIVE";  // Changed from is_active boolean
}

export default function FrontDeskManagement() {
    const [staff, setStaff] = useState<FrontDeskStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        phone: "",
    });

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const data = await apiRequest("/master/frontdesk");
            setStaff(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch front desk staff:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleCreate = async () => {
        if (!formData.email || !formData.first_name) {
            toast({ title: "Error", description: "Email and first name are required", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await apiRequest("/master/frontdesk", {
                method: "POST",
                body: JSON.stringify(formData),
            });
            toast({ title: "Success", description: "Front desk staff created successfully" });
            setIsDialogOpen(false);
            setFormData({ email: "", password: "", first_name: "", last_name: "", phone: "" });
            fetchStaff();
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to create staff", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleStatus = async (member: FrontDeskStaff) => {
        const isActive = member.status === "ACTIVE";
        const endpoint = isActive
            ? `/master/frontdesk/${member.id}/deactivate`
            : `/master/frontdesk/${member.id}/reactivate`;

        try {
            const response = await apiRequest(endpoint, {
                method: "PATCH",
            });

            // Optimistically update the local state
            setStaff(prev => prev.map(s =>
                s.id === member.id
                    ? { ...s, status: response.status as "ACTIVE" | "INACTIVE" }
                    : s
            ));

            toast({
                title: "Success",
                description: isActive ? "Staff deactivated successfully" : "Staff reactivated successfully"
            });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Front Desk Management</h1>
                    <p className="text-muted-foreground">Create and manage front desk staff accounts</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchStaff}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Add Staff
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Front Desk Account</DialogTitle>
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
                                    {isSubmitting ? "Creating..." : "Create Staff"}
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
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : staff.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No front desk staff found. Click "Add Staff" to create one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                staff.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">
                                            {formatName(`${member.first_name || ""} ${member.last_name || ""}`.trim()) || "N/A"}
                                        </TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>{member.phone_number || "N/A"}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={member.status === "ACTIVE" ? "default" : "secondary"}
                                                className={member.status === "ACTIVE"
                                                    ? "bg-green-500/15 text-green-600 border-green-500/30"
                                                    : "bg-gray-500/15 text-gray-600"
                                                }
                                            >
                                                {member.status === "ACTIVE" ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant={member.status === "ACTIVE" ? "destructive" : "default"}
                                                size="sm"
                                                onClick={() => toggleStatus(member)}
                                            >
                                                {member.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
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
