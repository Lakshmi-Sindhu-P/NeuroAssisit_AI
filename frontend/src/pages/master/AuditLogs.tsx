import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { RefreshCw } from "lucide-react";

interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    target_type: string;
    target_id: string;
    details: any;
    ip_address: string;
    created_at: string;
}

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await apiRequest("/master/audit-logs?limit=100");
            setLogs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getActionColor = (action: string) => {
        if (action.includes("CREATE")) return "bg-green-500/10 text-green-500";
        if (action.includes("UPDATE")) return "bg-blue-500/10 text-blue-500";
        if (action.includes("DEACTIVATE") || action.includes("DELETE")) return "bg-red-500/10 text-red-500";
        if (action.includes("LOGIN")) return "bg-yellow-500/10 text-yellow-500";
        return "bg-gray-500/10 text-gray-500";
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Audit Logs</h1>
                    <p className="text-muted-foreground">Track system activities and changes</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLogs}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Target Type</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>IP Address</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No audit logs yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-sm">
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getActionColor(log.action)} variant="outline">
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{log.target_type || "N/A"}</TableCell>
                                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                            {log.details ? JSON.stringify(log.details) : "N/A"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {log.ip_address || "N/A"}
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
