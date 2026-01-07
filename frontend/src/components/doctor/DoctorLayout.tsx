
import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    Clock,
    Settings,
    LogOut,
    Menu,
    Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function DoctorLayout() {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/login");
    };

    const navItems = [
        { href: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/doctor/patients", label: "My Patients", icon: Users },
        { href: "/doctor/history", label: "Consultation History", icon: Clock },
    ];

    const NavContent = () => (
        <div className="flex flex-col h-full py-6 px-4">
            {/* Logo / Header */}
            <div className="mb-10 flex items-center gap-3 px-2">
                <div className="h-10 w-10 bg-primary/20 backdrop-blur-md rounded-xl flex items-center justify-center text-primary font-bold shadow-sm ring-1 ring-white/20">
                    <Brain className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="font-bold text-xl tracking-tight text-foreground">NeuroAssist</h2>
                    <p className="text-xs text-muted-foreground font-medium">Doctor Console</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start mb-1 h-12 text-base font-medium transition-all duration-200",
                                    isActive && "bg-primary/10 text-primary hover:bg-primary/20 shadow-sm border border-primary/10",
                                    !isActive && "hover:bg-white/40 hover:backdrop-blur-sm"
                                )}
                            >
                                <item.icon className="mr-3 h-5 w-5 opacity-80" />
                                {item.label}
                            </Button>
                        </Link>
                    );
                })}
            </div>

            {/* User Profile / Footer */}
            <div className="mt-auto pt-6 border-t border-border/40">
                <div className="flex items-center gap-3 mb-6 px-2 p-3 rounded-xl bg-white/30 backdrop-blur-sm border border-white/20">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg ring-2 ring-white">
                        {user?.firstName?.charAt(0) || "D"}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold truncate text-foreground">Dr. {user?.firstName}</p>
                        <p className="text-xs text-muted-foreground truncate font-medium">Neurologist</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-red-50/50"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20 relative">
            {/* Desktop/Mobile Menu Trigger (Floating) */}
            <div className="fixed top-4 left-4 z-50 animate-in fade-in duration-700">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="bg-white/50 backdrop-blur-md border border-white/20 shadow-md hover:bg-white/80 transition-all rounded-full h-12 w-12"
                        >
                            <Menu className="h-6 w-6 text-primary" />
                        </Button>
                    </SheetTrigger>
                    {/* Glassmorphic Sidebar Overlay */}
                    <SheetContent side="left" className="p-0 w-80 bg-white/80 dark:bg-black/60 backdrop-blur-3xl border-r border-white/20 shadow-2xl">
                        <div className="h-full flex flex-col relative z-50">
                            {/* Background Gradient for Sidebar */}
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
                            <NavContent />
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Main Content Area (Full Width) */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Background Gradient Blob */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/30 via-purple-50/30 to-indigo-100/30 -z-10 blur-3xl opacity-50" />

                {/* Main Scrollable Content */}
                <main className="flex-1 overflow-auto p-4 md:p-8 pt-20 md:pt-8 scroll-smooth">
                    <div className="max-w-7xl mx-auto h-full animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
