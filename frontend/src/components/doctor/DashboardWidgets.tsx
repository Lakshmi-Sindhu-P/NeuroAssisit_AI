import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Users, ClipboardList, TrendingUp } from "lucide-react";

export function DashboardOverview({ queueLength }: { queueLength: number }) {
    const [date, setDate] = useState<Date | undefined>(new Date());

    // Mock Data for Charts
    const data = [
        { name: 'Seen', value: 12 },
        { name: 'Waiting', value: queueLength },
        { name: 'Cancelled', value: 2 },
    ];

    const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto p-1">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">Patients Today</p>
                            <h3 className="text-2xl font-bold">24</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">Pending Reviews</p>
                            <h3 className="text-2xl font-bold">{queueLength}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">Avg. Wait Time</p>
                            <h3 className="text-2xl font-bold">14m</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[300px]">
                {/* Calendar Widget */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex justify-center items-center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border shadow"
                        />
                    </CardContent>
                </Card>

                {/* Pie Chart Widget */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Patient Status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
