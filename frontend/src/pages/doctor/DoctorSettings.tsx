import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import {
    User,
    Settings as SettingsIcon,
    BrainCircuit,
    Bell,
    Shield,
    Save,
    Monitor,
    Mic,
    Globe,
    Sparkles,
    BookOpen,
    Plus,
    Trash2,
    Pill,
    Stethoscope
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatName } from "@/lib/formatName";

interface MedicalTerm {
    id: string;
    term: string;
    category: "DISEASE" | "MEDICATION" | "SYMPTOM";
    description?: string;
}

export default function DoctorSettings() {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);

    // Word Bank State
    const [terms, setTerms] = useState<MedicalTerm[]>([]);
    const [isLoadingTerms, setIsLoadingTerms] = useState(false);
    const [newTerm, setNewTerm] = useState("");
    const [newCategory, setNewCategory] = useState<"DISEASE" | "MEDICATION">("DISEASE");

    useEffect(() => {
        fetchTerms();
    }, []);

    const fetchTerms = async () => {
        setIsLoadingTerms(true);
        try {
            const data = await apiRequest("/medical-terms/");
            setTerms(data);
        } catch (error) {
            console.error("Failed to fetch terms", error);
        } finally {
            setIsLoadingTerms(false);
        }
    };

    const handleAddTerm = async () => {
        if (!newTerm.trim()) return;
        try {
            await apiRequest("/medical-terms/", {
                method: "POST",
                body: JSON.stringify({
                    term: newTerm,
                    category: newCategory
                })
            });
            setNewTerm("");
            toast.success("Term added successfully");
            fetchTerms();
        } catch (error) {
            toast.error("Failed to add term");
        }
    };

    const handleDeleteTerm = async (id: string) => {
        try {
            await apiRequest(`/medical-terms/${id}`, { method: "DELETE" });
            toast.success("Term deleted");
            setTerms(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            toast.error("Failed to delete term");
        }
    };

    // Profile State
    const [profile, setProfile] = useState({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        specialty: "Neurology",
        licenseNumber: "LIC-88293-TX",
    });

    // AI & Transcription State
    const [aiSettings, setAiSettings] = useState({
        autoSummarize: true,
        model: "gemini-2.0-flash",
        language: "english",
        recordHighQuality: true,
        showConfidence: true
    });

    // UI Preferences
    const [uiSettings, setUiSettings] = useState({
        theme: "system",
        compactView: false,
        notifications: true,
        soundEffects: true
    });

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSaving(false);
        toast.success("Settings saved successfully!");
    };

    return (
        <div className="h-full max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-end px-1">
                <div>
                    <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <SettingsIcon className="h-8 w-8 text-primary" /> Settings
                    </h2>
                    <p className="text-muted-foreground mt-1">Manage your professional profile and clinical AI preferences.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="shadow-lg hover:scale-105 transition-all">
                    {isSaving ? <BrainCircuit className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                </Button>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 ring-1 ring-black/5">
                    <TabsTrigger value="profile" className="gap-2 px-6">
                        <User className="h-4 w-4" /> Profile
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="gap-2 px-6">
                        <BrainCircuit className="h-4 w-4" /> AI & Transcription
                    </TabsTrigger>
                    <TabsTrigger value="word-bank" className="gap-2 px-6">
                        <BookOpen className="h-4 w-4" /> Word Bank
                    </TabsTrigger>
                    <TabsTrigger value="system" className="gap-2 px-6">
                        <Monitor className="h-4 w-4" /> System
                    </TabsTrigger>
                </TabsList>

                {/* --- Profile Tab --- */}
                <TabsContent value="profile" className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 border-none shadow-sm glass-card">
                            <CardHeader>
                                <CardTitle className="text-lg">Professional Information</CardTitle>
                                <CardDescription>This information will appear on generated clinical documents.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>First Name</Label>
                                        <Input
                                            value={profile.firstName}
                                            onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Last Name</Label>
                                        <Input
                                            value={profile.lastName}
                                            onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input
                                        type="email"
                                        value={profile.email}
                                        disabled
                                        className="bg-muted/50"
                                    />
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Read-only (System ID)</p>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Clinical Specialty</Label>
                                        <Input
                                            value={profile.specialty}
                                            onChange={e => setProfile({ ...profile, specialty: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Medical License #</Label>
                                        <Input
                                            value={profile.licenseNumber}
                                            onChange={e => setProfile({ ...profile, licenseNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-6">
                            <Card className="border-none shadow-sm bg-primary/5">
                                <CardHeader className="pb-2">
                                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 border-2 border-primary/20">
                                        <span className="text-2xl font-bold text-primary">
                                            {profile.firstName[0]}{profile.lastName[0]}
                                        </span>
                                    </div>
                                    <CardTitle className="text-center text-lg">
                                        Dr. {formatName(profile.firstName)} {formatName(profile.lastName)}
                                    </CardTitle>
                                    <CardDescription className="text-center">{profile.specialty}</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Button variant="outline" size="sm" className="w-full text-xs font-bold uppercase tracking-wider">
                                        Update Photo
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- AI & Transcription Tab --- */}
                <TabsContent value="ai" className="animate-in fade-in duration-300">
                    <Card className="border-none shadow-sm glass-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BrainCircuit className="h-5 w-5 text-primary" /> AI Scribe Configuration
                            </CardTitle>
                            <CardDescription>Tailor how the AI processes your consultations and generates notes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Automatic SOAP Drafting</Label>
                                        <p className="text-sm text-muted-foreground">Automatically trigger AI analysis after audio upload.</p>
                                    </div>
                                    <Switch
                                        checked={aiSettings.autoSummarize}
                                        onCheckedChange={checked => setAiSettings({ ...aiSettings, autoSummarize: checked })}
                                    />
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Sparkles className="h-3 w-3 text-primary" /> LLM Model
                                        </Label>
                                        <Select
                                            value={aiSettings.model}
                                            onValueChange={val => setAiSettings({ ...aiSettings, model: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</SelectItem>
                                                <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground">High performance mode for real-time transcription.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Globe className="h-3 w-3 text-primary" /> Default Language
                                        </Label>
                                        <Select
                                            value={aiSettings.language}
                                            onValueChange={val => setAiSettings({ ...aiSettings, language: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="english">English (US)</SelectItem>
                                                <SelectItem value="spanish">Spanish</SelectItem>
                                                <SelectItem value="hindi">Hindi</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Confidence Highlighting</Label>
                                        <p className="text-sm text-muted-foreground">Visually flag medical terms the AI is uncertain about.</p>
                                    </div>
                                    <Switch
                                        checked={aiSettings.showConfidence}
                                        onCheckedChange={checked => setAiSettings({ ...aiSettings, showConfidence: checked })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- Word Bank Tab --- */}
                <TabsContent value="word-bank" className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Add Term Card */}
                        <Card className="md:col-span-1 border-none shadow-sm glass-card h-fit">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Plus className="h-5 w-5 text-primary" /> Add New Term
                                </CardTitle>
                                <CardDescription>Add custom diseases or medications to the system.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Term Name</Label>
                                    <Input
                                        placeholder="e.g. Ibuprofen"
                                        value={newTerm}
                                        onChange={(e) => setNewTerm(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select
                                        value={newCategory}
                                        onValueChange={(val: any) => setNewCategory(val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DISEASE">Disease / Condition</SelectItem>
                                            <SelectItem value="MEDICATION">Medication</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAddTerm} className="w-full">
                                    <Plus className="h-4 w-4 mr-2" /> Add Term
                                </Button>
                            </CardContent>
                        </Card>

                        {/* List Terms */}
                        <Card className="md:col-span-2 border-none shadow-sm glass-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-primary" /> Medical Library
                                </CardTitle>
                                <CardDescription>Manage approved medical terminology.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="diseases" className="w-full">
                                    <TabsList className="w-full grid grid-cols-2 mb-4">
                                        <TabsTrigger value="diseases">Diseases ({terms.filter(t => t.category === "DISEASE").length})</TabsTrigger>
                                        <TabsTrigger value="medications">Medications ({terms.filter(t => t.category === "MEDICATION").length})</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="diseases" className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                        {terms.filter(t => t.category === "DISEASE").map(term => (
                                            <div key={term.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                                                        <Stethoscope className="h-4 w-4 text-red-600" />
                                                    </div>
                                                    <span className="font-medium">{term.term}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteTerm(term.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {terms.filter(t => t.category === "DISEASE").length === 0 && (
                                            <p className="text-center text-muted-foreground py-8">No diseases added yet.</p>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="medications" className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                        {terms.filter(t => t.category === "MEDICATION").map(term => (
                                            <div key={term.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <Pill className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <span className="font-medium">{term.term}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteTerm(term.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {terms.filter(t => t.category === "MEDICATION").length === 0 && (
                                            <p className="text-center text-muted-foreground py-8">No medications added yet.</p>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* --- System Tab --- */}
                <TabsContent value="system" className="animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-none shadow-sm glass-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Monitor className="h-5 w-5 text-primary" /> Visuals & Interface
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Theme Mode</Label>
                                    <Select value={uiSettings.theme} onValueChange={val => setUiSettings({ ...uiSettings, theme: val })}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">Light</SelectItem>
                                            <SelectItem value="dark">Dark</SelectItem>
                                            <SelectItem value="system">System</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label>Compact Dashboard</Label>
                                        <p className="text-[10px] text-muted-foreground">Maximize information density in the queue list.</p>
                                    </div>
                                    <Switch
                                        checked={uiSettings.compactView}
                                        onCheckedChange={checked => setUiSettings({ ...uiSettings, compactView: checked })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm glass-card">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Bell className="h-5 w-5 text-primary" /> Alerts & Security
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>System Notifications</Label>
                                    <Switch
                                        checked={uiSettings.notifications}
                                        onCheckedChange={checked => setUiSettings({ ...uiSettings, notifications: checked })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Interaction Sounds</Label>
                                    <Switch
                                        checked={uiSettings.soundEffects}
                                        onCheckedChange={checked => setUiSettings({ ...uiSettings, soundEffects: checked })}
                                    />
                                </div>
                                <Separator />
                                <Button variant="link" className="p-0 h-auto text-primary font-bold">
                                    Change Security PIN / Password &rarr;
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
