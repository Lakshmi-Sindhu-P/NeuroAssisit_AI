import {
    LayoutDashboard,
    Users,
    ClipboardList,
    History,
    Settings,
    LogOut
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
    SidebarFooter,
    useSidebar,
} from "@/components/ui/sidebar";

const mainNavItems = [
    { title: "Dashboard", url: "/doctor/dashboard", icon: LayoutDashboard },
    // { title: "Patient Search", url: "/doctor/patients", icon: Users },
    // { title: "Clinical History", url: "/doctor/history", icon: History },
];

export function DoctorSidebar() {
    const { state } = useSidebar();
    const collapsed = state === "collapsed";

    return (
        <Sidebar collapsible="icon" className="border-r border-border/50">
            <SidebarHeader className="p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-lg">N</span>
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="font-semibold text-foreground">NeuroAssist</span>
                            <span className="text-xs text-muted-foreground">Doctor Console</span>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Clinician Tools</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title}>
                                        <NavLink
                                            to={item.url}
                                            end={item.url === "/doctor/dashboard"}
                                            className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-accent"
                                            activeClassName="bg-primary/10 text-primary font-medium"
                                        >
                                            <item.icon className="h-5 w-5 shrink-0" />
                                            <span>{item.title}</span>
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Logout">
                            <NavLink
                                to="/login"
                                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                                <LogOut className="h-5 w-5 shrink-0" />
                                <span>Logout</span>
                            </NavLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
