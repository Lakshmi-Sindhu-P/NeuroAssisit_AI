import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import BookAppointment from "./pages/dashboard/BookAppointment";
import MyAppointments from "./pages/dashboard/MyAppointments";
import AppointmentDetails from "./pages/dashboard/AppointmentDetails";
import AppointmentConfirmed from "./pages/dashboard/AppointmentConfirmed";
import PastConsultations from "./pages/dashboard/PastConsultations";
import Profile from "./pages/dashboard/Profile";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminLayout } from "./components/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PatientCheckIn from "./pages/admin/PatientCheckIn";
import ClinicianStatus from "./pages/admin/ClinicianStatus";
import Reports from "./pages/admin/Reports";

// Master Admin Pages
import MasterLayout from "./pages/master/MasterLayout";
import MasterDashboard from "./pages/master/MasterDashboard";
import DoctorsManagement from "./pages/master/DoctorsManagement";
import FrontDeskManagement from "./pages/master/FrontDeskManagement";
import PatientsView from "./pages/master/PatientsView";

// Doctor Pages
import { DoctorLayout } from "./components/doctor/DoctorLayout";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientQueue from "./pages/doctor/PatientQueue";
import DoctorSettings from "./pages/doctor/DoctorSettings";

// Route Protection
import { ProtectedRoute, RequireAuth } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />

            {/* Patient Dashboard - Protected for PATIENT role */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="appointments" element={<MyAppointments />} />
              <Route path="appointments/:appointmentId" element={<AppointmentDetails />} />
              <Route path="book-appointment" element={<BookAppointment />} />
              <Route path="appointment-confirmed" element={<AppointmentConfirmed />} />
              <Route path="consultations" element={<PastConsultations />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Front Desk Admin - Protected for FRONT_DESK and MASTER_ADMIN */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={["front-desk", "master-admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="check-in" element={<PatientCheckIn />} />
              <Route path="clinicians" element={<ClinicianStatus />} />
              <Route path="reports" element={<Reports />} />
            </Route>

            {/* Master Admin Routes - Protected for MASTER_ADMIN only */}
            <Route path="/admin/master" element={
              <ProtectedRoute allowedRoles={["master-admin"]}>
                <MasterLayout />
              </ProtectedRoute>
            }>
              <Route index element={<MasterDashboard />} />
              <Route path="doctors" element={<DoctorsManagement />} />
              <Route path="frontdesk" element={<FrontDeskManagement />} />
              <Route path="patients" element={<PatientsView />} />
            </Route>

            {/* Doctor Console - Protected for DOCTOR and MASTER_ADMIN */}
            <Route path="/doctor" element={
              <ProtectedRoute allowedRoles={["doctor", "master-admin"]}>
                <DoctorLayout />
              </ProtectedRoute>
            }>
              <Route path="dashboard" element={<DoctorDashboard />} />
              <Route path="queue" element={<PatientQueue />} />
              <Route path="settings" element={<DoctorSettings />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

