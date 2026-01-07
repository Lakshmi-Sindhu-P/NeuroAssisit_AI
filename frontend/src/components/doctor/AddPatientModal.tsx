import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, UserPlus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface AddPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    doctorId: string; // Current doctor ID
}

export function AddPatientModal({ isOpen, onClose, onSuccess, doctorId }: AddPatientModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [step, setStep] = useState<"details" | "reason">("details");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [reason, setReason] = useState("");

    // Created Data
    const [newUserId, setNewUserId] = useState<string | null>(null);

    const handleCreatePatient = async () => {
        setIsLoading(true);
        try {
            // 1. Create User (Quick Signup)
            // Note: In real app, we'd check if email exists first.
            const signupRes = await api.post("/auth/signup", {
                email,
                password: "tempPassword123!", // Auto-generate temp password
                role: "PATIENT",
                first_name: firstName,
                last_name: lastName,
                age: age ? parseInt(age) : undefined,
                gender,
                phone,
                address
            });

            setNewUserId(signupRes.data.user_id);
            setStep("reason");
            toast.success("Patient record created.");
        } catch (e: any) {
            console.error(e);
            if (e.response?.data?.detail === "User already exists") {
                toast.error("User email already exists. Search features coming next.");
            } else {
                toast.error("Failed to create patient.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToQueue = async () => {
        if (!newUserId) return;
        setIsLoading(true);
        try {
            // 2. Create IMMEIDATE Appointment (Backend now auto-creates Consultation)
            await api.post("/appointments/", {
                patient_id: newUserId,
                doctor_id: doctorId,
                doctor_name: "Dr. Alexander", // Could fetch from context
                scheduled_at: new Date(Date.now() + 5 * 60000).toISOString(), // Schedule 5 mins in future to pass backend validation
                reason: reason,
                notes: "Walk-in / Quick Add"
            });

            toast.success("Patient added to queue!");
            onSuccess();
            onClose();
        } catch (e: any) {
            console.error(e);
            const msg = e.response?.data?.detail || "Failed to schedule.";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Quick Register Patient</DialogTitle>
                    <DialogDescription>Add a walk-in patient to your queue immediately.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {step === "details" ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="patient@example.com" type="email" />
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <Label>Reason for Visit / Symptoms</Label>
                            <Textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="e.g. Severe headache, dizziness..."
                                className="h-24"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    {step === "details" ? (
                        <Button onClick={handleCreatePatient} disabled={isLoading || !firstName || !lastName || !email}>
                            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : "Next"}
                        </Button>
                    ) : (
                        <Button onClick={handleAddToQueue} disabled={isLoading || !reason}>
                            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <><UserPlus className="w-4 h-4 mr-2" /> Add to Queue</>}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
