import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DoctorSidebar } from "./DoctorSidebar";
import { Outlet } from "react-router-dom";

export function DoctorLayout() {
    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-background">
                <DoctorSidebar />
                <main className="flex-1 flex flex-col">
                    <header className="h-16 border-b border-border/50 flex items-center px-4 bg-card/50">
                        <SidebarTrigger className="mr-4" />
                        <h1 className="text-lg font-medium text-foreground">Doctor Console</h1>
                    </header>
                    <div className="flex-1 overflow-hidden">
                        <Outlet />
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}
