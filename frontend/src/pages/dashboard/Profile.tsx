import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Mail, MapPin, Shield, Heart, AlertCircle, Bell, LogOut, Save, Droplets, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { IndianPhoneInput } from "@/components/IndianPhoneInput";
import { useAuth } from "@/contexts/AuthContext";
import { formatName } from "@/lib/formatName";
import api from "@/lib/api";
import { useEffect } from "react";

export default function Profile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // Helper to get full name from user context with proper casing
  const getFullName = () => {
    if (!user) return "User";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;
    return formatName(fullName);
  };

  // Personal Information - use auth user data
  const [personalInfo, setPersonalInfo] = useState({
    fullName: getFullName(),
    email: user?.email || "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    age: "", // Added missing age field
  });

  // Medical History
  const [medicalHistory, setMedicalHistory] = useState({
    bloodType: "B+",
    allergies: "None known",
    chronicConditions: "Mild migraines",
    currentMedications: "None",
    familyHistory: "Father: Hypertension",
  });

  // Emergency Contact
  const [emergencyContact, setEmergencyContact] = useState({
    name: "",
    relationship: "",
    phone: "",
    email: "",
  });

  // Re-added Notification Settings State
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    appointmentReminders: true,
  });

  // Fetch Profile on Mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get("/users/me/profile");
        if (data) {
          setPersonalInfo(prev => ({
            ...prev,
            phone: data.phone_number || "",
            dateOfBirth: data.date_of_birth ? data.date_of_birth.split('T')[0] : "",
            gender: data.gender || data.gender_identity || "", // Handle both legacy and new fields
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            zipCode: data.zip_code || "",
            age: data.age?.toString() || "",
          }));

          setMedicalHistory(prev => ({
            ...prev,
            currentMedications: data.current_medications || "None",
            medicalHistory: data.medical_history || "None" // Map to generic history if specific fields missing
          }));

          setEmergencyContact(prev => ({
            ...prev,
            name: data.emergency_contact_name || "",
            phone: data.emergency_contact_phone || ""
          }));
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
        toast({
          title: "Error",
          description: "Failed to load profile data.",
          variant: "destructive"
        });
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        // Standard Fields
        phone_number: personalInfo.phone,
        address: personalInfo.address,
        // New MVP Fields
        date_of_birth: personalInfo.dateOfBirth ? new Date(personalInfo.dateOfBirth).toISOString() : null,
        gender_identity: personalInfo.gender, // Mapping UI 'gender' to backend 'gender_identity'
        age: personalInfo.dateOfBirth ?
          new Date().getFullYear() - new Date(personalInfo.dateOfBirth).getFullYear()
          : (personalInfo.age ? parseInt(personalInfo.age) : null),

        emergency_contact_name: emergencyContact.name,
        emergency_contact_phone: emergencyContact.phone,
        current_medications: medicalHistory.currentMedications,
        medical_history: medicalHistory.chronicConditions // simple mapping for now
      };

      await api.patch("/users/me/profile", payload);

      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Patient Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and settings
          </p>
        </div>
        <Button variant="destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{personalInfo.fullName}</h2>
              <p className="text-muted-foreground">{personalInfo.email}</p>
              <p className="text-sm text-muted-foreground mt-1">Member since October 2024</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="medical">Medical History</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={personalInfo.fullName}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={personalInfo.age}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, age: e.target.value })}
                    placeholder="Auto-calculated if DOB set"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <IndianPhoneInput
                    id="phone"
                    value={personalInfo.phone}
                    onChange={(value) => setPersonalInfo({ ...personalInfo, phone: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={personalInfo.dateOfBirth}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={personalInfo.gender}
                    onValueChange={(value) => setPersonalInfo({ ...personalInfo, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={personalInfo.address}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* Notification Settings */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Notification Settings
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">SMS Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive text messages</p>
                    </div>
                    <Switch
                      checked={settings.smsNotifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Appointment Reminders</p>
                      <p className="text-xs text-muted-foreground">Get reminded before appointments</p>
                    </div>
                    <Switch
                      checked={settings.appointmentReminders}
                      onCheckedChange={(checked) => setSettings({ ...settings, appointmentReminders: checked })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medical History Tab */}
        <TabsContent value="medical">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Medical History
              </CardTitle>
              <CardDescription>Keep your medical information up to date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bloodType" className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-muted-foreground" />
                    Blood Type
                  </Label>
                  <Select
                    value={medicalHistory.bloodType}
                    onValueChange={(value) => setMedicalHistory({ ...medicalHistory, bloodType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allergies" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Known Allergies
                  </Label>
                  <Input
                    id="allergies"
                    value={medicalHistory.allergies}
                    onChange={(e) => setMedicalHistory({ ...medicalHistory, allergies: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="chronic" className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Chronic Conditions
                  </Label>
                  <Textarea
                    id="chronic"
                    value={medicalHistory.chronicConditions}
                    onChange={(e) => setMedicalHistory({ ...medicalHistory, chronicConditions: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medications">Current Medications</Label>
                  <Input
                    id="medications"
                    value={medicalHistory.currentMedications}
                    onChange={(e) => setMedicalHistory({ ...medicalHistory, currentMedications: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="family">Family Medical History</Label>
                  <Input
                    id="family"
                    value={medicalHistory.familyHistory}
                    onChange={(e) => setMedicalHistory({ ...medicalHistory, familyHistory: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contact Tab */}
        <TabsContent value="emergency">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Emergency Contact
              </CardTitle>
              <CardDescription>Who should we contact in case of emergency?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Contact Name</Label>
                  <Input
                    id="emergencyName"
                    value={emergencyContact.name}
                    onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select
                    value={emergencyContact.relationship}
                    onValueChange={(value) => setEmergencyContact({ ...emergencyContact, relationship: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Phone Number</Label>
                  <IndianPhoneInput
                    id="emergencyPhone"
                    value={emergencyContact.phone}
                    onChange={(value) => setEmergencyContact({ ...emergencyContact, phone: value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyEmail">Email Address</Label>
                  <Input
                    id="emergencyEmail"
                    type="email"
                    value={emergencyContact.email}
                    onChange={(e) => setEmergencyContact({ ...emergencyContact, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">Important</p>
                  <p className="text-muted-foreground">
                    This contact will be notified in case of medical emergencies.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-4 pt-4 pb-8">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
