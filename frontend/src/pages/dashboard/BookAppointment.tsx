import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  RefreshCw,
  Shield,
  CheckCircle2,
  Brain,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatDoctorName } from "@/lib/formatName";
import { AudioRecorder } from "@/components/audio/AudioRecorder";
import { TranscriptView } from "@/components/audio/TranscriptView";

const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM"
];

export default function BookAppointment() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step State (1 = Date & Time, 2 = Record Symptoms)
  const [currentStep, setCurrentStep] = useState(1);

  // Date & Time State
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Recording Result State
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Booking State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);

  // Transcription State (Editable Transcription Flow)
  const [transcriptionText, setTranscriptionText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [showTranscription, setShowTranscription] = useState(false);

  // Fetch doctors on mount
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        // Use patient-specific endpoint that only returns AVAILABLE doctors
        const data = await apiRequest("/patient/doctors");
        setDoctors(data);
        if (data.length > 0) setSelectedDoctor(data[0]);
      } catch (e) {
        console.error("Failed to fetch doctors", e);
      }
    };
    fetchDoctors();
  }, []);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isStep1Complete = date && selectedTime;







  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    // Reset transcription state
    setTranscriptionText("");
    setTranscriptionError(null);
    setShowTranscription(false);
  };

  // Transcribe recording using standalone STT endpoint (no consultation_id needed)
  const transcribeRecordingNow = async (blob: Blob) => {
    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'symptom_recording.webm');

      const token = localStorage.getItem('neuroassist_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/transcription/speech-to-text`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error("Unable to transcribe audio. Please try again or continue with text.");
      }

      const data = await response.json();
      setTranscriptionText(data.transcript || data.text || "");
      setShowTranscription(true);
      console.log("Transcription completed:", data.transcription?.substring(0, 100));
    } catch (error: any) {
      console.error("Transcription error:", error);
      setTranscriptionError(error.message || "Failed to transcribe audio. Please try recording again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleConfirmDateTime = () => {
    if (isStep1Complete) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const generateBookingId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `NA-${year}-${randomNum}`;
  };

  // Check if a time slot is in the past (for today's date)
  const isTimeSlotPast = (time: string) => {
    if (!date) return false;
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (!isToday) return false;

    // Parse time like "09:00 AM" to hours
    const [timePart, ampm] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);
    if (ampm === 'PM' && hours !== 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const slotTime = new Date(today);
    slotTime.setHours(hours, minutes, 0, 0);

    return slotTime <= today;
  };

  const handleSubmitSymptoms = async () => {
    if (!date || !selectedTime || !selectedDoctor) {
      toast({ title: "Missing Info", description: "Please complete all fields.", variant: "destructive" });
      return;
    }

    // Validate transcription if audio was recorded
    if (audioBlob && showTranscription && !transcriptionText.trim()) {
      toast({ title: "Empty Transcription", description: "Please review and ensure the transcription is not empty.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse time and combine with date
      const [timePart, ampm] = selectedTime.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;

      const scheduledAt = new Date(date);
      scheduledAt.setHours(hours, minutes, 0, 0);

      // Validate time is in future
      if (scheduledAt <= new Date()) {
        toast({ title: "Invalid Time", description: "Cannot book appointment in the past.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      // Create appointment (this also creates a consultation)
      const res = await apiRequest("/appointments/", {
        method: "POST",
        body: JSON.stringify({
          patient_id: user?.id,
          doctor_id: selectedDoctor.id,
          doctor_name: formatDoctorName(selectedDoctor.first_name, selectedDoctor.last_name),
          scheduled_at: scheduledAt.toISOString(),
          reason: transcriptionText || additionalNotes || "General consultation",
          notes: additionalNotes
        })
      });

      const createdConsultationId = res.consultation_id;
      let triageResult = null;

      // If audio was recorded, upload it for the created consultation
      if (audioBlob && createdConsultationId) {
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'symptom_recording.webm');
          formData.append('source', 'PRE_VISIT');

          const token = localStorage.getItem('neuroassist_token');

          // Upload audio to associate with consultation
          await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/consultations/${createdConsultationId}/upload`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData
            }
          );
          console.log("Audio uploaded successfully for consultation:", createdConsultationId);
        } catch (symptomError) {
          console.error("Audio upload error (non-blocking):", symptomError);
        }
      }

      const bookingData = {
        date: date,
        time: selectedTime,
        doctorName: formatDoctorName(selectedDoctor.first_name, selectedDoctor.last_name),
        specialization: selectedDoctor.specialization || "General",
        location: "NeuroAssist Clinic",
        audioUrl: audioUrl || undefined,
        notes: additionalNotes || undefined,
        bookingId: res.id,
        triageCategory: triageResult?.triage_category || res.triage_category
      };

      navigate("/dashboard/appointment-confirmed", {
        state: { bookingData },
        replace: true
      });
    } catch (error: any) {
      toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
    }
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, [audioUrl]);



  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      {/* Page Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Brain className="h-8 w-8" />
          <span className="text-2xl font-bold">NeuroAssist</span>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            currentStep === 1
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary"
          )}>
            <CalendarIcon className="h-4 w-4" />
            <span>Date & Time</span>
          </div>
          <div className="w-8 h-0.5 bg-border" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            currentStep === 2
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}>
            <Mic className="h-4 w-4" />
            <span>Record Symptoms</span>
          </div>
        </div>
      </div>

      {/* STEP 1: Date & Time Selection */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Book Appointment</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Select your preferred date and time for your neurology consultation.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Date Selection */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CalendarIcon className="h-5 w-5 text-primary" />
                    Select Date
                  </CardTitle>
                  <CardDescription>Choose a date for your appointment (only future dates)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => {
                        // Compare date only (not time) - allow same-day bookings
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const compareDate = new Date(d);
                        compareDate.setHours(0, 0, 0, 0);
                        return compareDate < today || d.getDay() === 0;
                      }}
                      className="rounded-xl border border-border/50 pointer-events-auto"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Time Slot Selection */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Clock className="h-5 w-5 text-primary" />
                    Select Time Slot (IST)
                  </CardTitle>
                  <CardDescription>
                    {date
                      ? `Available slots for ${format(date, "d MMMM yyyy")}`
                      : "Please select a date first"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {timeSlots.map((time) => {
                      const isPast = isTimeSlotPast(time);
                      return (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          className={cn(
                            "h-12 transition-all font-medium",
                            selectedTime === time && "ring-2 ring-primary/20 shadow-md",
                            isPast && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => !isPast && setSelectedTime(time)}
                          disabled={!date || isPast}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          {time}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Doctor Selection */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Brain className="h-5 w-5 text-primary" />
                    Select Doctor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <label htmlFor="doctor-select" className="text-sm text-muted-foreground">
                      Choose a doctor for your appointment
                    </label>
                    <select
                      id="doctor-select"
                      value={selectedDoctor?.id || ""}
                      onChange={(e) => {
                        const doctor = doctors.find(d => d.id === e.target.value);
                        setSelectedDoctor(doctor || null);
                      }}
                      disabled={doctors.length === 0}
                      className={cn(
                        "w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all cursor-pointer",
                        "appearance-none bg-no-repeat bg-right",
                        "text-base font-medium"
                      )}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                        backgroundPosition: 'right 12px center',
                        backgroundSize: '20px',
                        paddingRight: '44px'
                      }}
                    >
                      <option value="" disabled>
                        {doctors.length === 0 ? "Loading doctors..." : "Choose a doctor"}
                      </option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {formatDoctorName(doctor.first_name, doctor.last_name)} — {doctor.specialization || "General Practice"}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary */}
            <div>
              <Card className="border-border/50 sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Selected Appointment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium text-foreground">
                        {date ? format(date, "d MMM yyyy") : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Time (IST)</span>
                      <span className="font-medium text-foreground">
                        {selectedTime || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Doctor</span>
                      <span className="font-medium text-foreground">
                        {selectedDoctor ? formatDoctorName(selectedDoctor.first_name, selectedDoctor.last_name) : "—"}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <Button
                    className="w-full h-12"
                    disabled={!isStep1Complete}
                    onClick={handleConfirmDateTime}
                  >
                    Confirm Date & Time
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  {!isStep1Complete && (
                    <p className="text-xs text-muted-foreground text-center">
                      Please select both date and time to continue
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Record Symptoms */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Describe Your Symptoms</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Please record or type your symptoms clearly. This will help your doctor prepare for the consultation.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Recording */}
            <div className="lg:col-span-2 space-y-6">
              {/* Appointment Summary */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Appointment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date</span>
                      <p className="font-medium text-foreground">{date && format(date, "d MMM yyyy")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Time (IST)</span>
                      <p className="font-medium text-foreground">{selectedTime}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Doctor</span>
                      <p className="font-medium text-foreground">
                        {selectedDoctor ? formatDoctorName(selectedDoctor.first_name, selectedDoctor.last_name) : "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Voice Recording Section - Hidden after transcription is displayed */}
              {!showTranscription && !isTranscribing && (
                <Card className="border-border/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Mic className="h-5 w-5 text-primary" />
                      Voice Recording
                    </CardTitle>
                    <CardDescription>
                      Record your symptoms using your voice
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <AudioRecorder
                      onRecordingComplete={(blob, url) => {
                        setAudioBlob(blob);
                        setAudioUrl(url);
                        transcribeRecordingNow(blob);
                      }}
                      onReset={resetRecording}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Transcription View (Handles Loading, Error, Edit) */}
              {(showTranscription || isTranscribing || transcriptionError) && (
                <TranscriptView
                  transcript={transcriptionText}
                  isTranscribing={isTranscribing}
                  error={transcriptionError}
                  onTranscriptChange={setTranscriptionText}
                  onRetry={resetRecording}
                />
              )}

              {/* Text Input */}
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Additional Notes (Optional)</CardTitle>
                  <CardDescription>
                    Type any additional details about your symptoms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Example: I have been experiencing frequent headaches and dizziness for the past few days."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              <Card className="border-border/50 sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Ready to Submit?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground bg-primary/5 rounded-lg p-3">
                    <Shield className="h-5 w-5 text-primary flex-shrink-0" />
                    <p>Your recording and notes are securely stored.</p>
                  </div>

                  <Button
                    className="w-full h-12"
                    onClick={handleSubmitSymptoms}
                    disabled={isSubmitting || isTranscribing || (audioBlob && showTranscription && !transcriptionText.trim())}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Booking...
                      </>
                    ) : (
                      <>
                        Submit Symptoms
                        <CheckCircle2 className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>

                  {/* Validation message for empty transcription */}
                  {audioBlob && showTranscription && !transcriptionText.trim() && (
                    <p className="text-xs text-destructive text-center">
                      Please ensure the transcription is not empty before submitting.
                    </p>
                  )}

                  <Button
                    variant="outline"
                    className="w-full h-10"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Date & Time
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
