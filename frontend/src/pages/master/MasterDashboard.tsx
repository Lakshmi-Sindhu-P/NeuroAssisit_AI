import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { Users, UserCog, Building2, ClipboardList } from "lucide-react";

interface Stats {
    doctors: number;
    frontdesk: number;
    patients: number;
    clinics: number;
}

export default function MasterDashboard() {
    const [stats, setStats] = useState<Stats>({ doctors: 0, frontdesk: 0, patients: 0, clinics: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await apiRequest("/master/stats");
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = [
        { label: "Doctors", value: stats.doctors, icon: UserCog, color: "text-blue-500" },
        { label: "Front Desk", value: stats.frontdesk, icon: Users, color: "text-green-500" },
        { label: "Patients", value: stats.patients, icon: Users, color: "text-purple-500" },
        { label: "Clinics", value: stats.clinics, icon: Building2, color: "text-orange-500" },
    ];

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Master Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage doctors, front desk staff, and system settings</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {loading ? "..." : stat.value}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5" />
                        Quick Actions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <a
                            href="/admin/master/doctors"
                            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                            <UserCog className="w-8 h-8 text-blue-500 mb-2" />
                            <h3 className="font-medium">Manage Doctors</h3>
                            <p className="text-sm text-muted-foreground">Add, edit, or deactivate doctors</p>
                        </a>
                        <a
                            href="/admin/master/frontdesk"
                            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                            <Users className="w-8 h-8 text-green-500 mb-2" />
                            <h3 className="font-medium">Manage Front Desk</h3>
                            <p className="text-sm text-muted-foreground">Add or manage front desk staff</p>
                        </a>
                        <a
                            href="/admin/master/audit-logs"
                            className="p-4 rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                            <ClipboardList className="w-8 h-8 text-orange-500 mb-2" />
                            <h3 className="font-medium">View Audit Logs</h3>
                            <p className="text-sm text-muted-foreground">Track system activities</p>
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
