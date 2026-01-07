import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pill, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface PrescriptionItem {
    drug: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
}

interface PrescriptionWriterProps {
    initialValue?: string;
    onChange: (formattedText: string, items: PrescriptionItem[]) => void;
    onValidate?: (items: PrescriptionItem[]) => void;
}

export function PrescriptionWriter({ initialValue, onChange, onValidate }: PrescriptionWriterProps) {
    const [items, setItems] = useState<PrescriptionItem[]>([]);

    // Form State
    const [drug, setDrug] = useState("");
    const [dosage, setDosage] = useState("");
    const [frequency, setFrequency] = useState("1-0-1");
    const [duration, setDuration] = useState("5 Days");

    const handleAdd = () => {
        if (!drug || !dosage) return;

        const newItem: PrescriptionItem = { drug, dosage, frequency, duration };
        const newItems = [...items, newItem];
        setItems(newItems);

        // Reset Form
        setDrug("");
        setDosage("");

        // Notify Parent
        updateParent(newItems);
    };

    const handleRemove = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
        updateParent(newItems);
    };

    const updateParent = (currentItems: PrescriptionItem[]) => {
        // Generate Text Format
        const text = currentItems.map(item =>
            `- ${item.drug} ${item.dosage} | ${item.frequency} for ${item.duration}`
        ).join("\n");

        onChange(text, currentItems);

        if (onValidate) {
            onValidate(currentItems);
        }
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 space-y-4">
                {/* Add Drug Form */}
                <div className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="col-span-4 space-y-1">
                        <Label className="text-xs font-semibold uppercase text-slate-500">Drug Name</Label>
                        <Input
                            placeholder="e.g. Paracetamol"
                            value={drug}
                            onChange={(e) => setDrug(e.target.value)}
                            className="bg-white h-8 text-sm"
                        />
                    </div>
                    <div className="col-span-3 space-y-1">
                        <Label className="text-xs font-semibold uppercase text-slate-500">Dosage</Label>
                        <Input
                            placeholder="e.g. 500mg"
                            value={dosage}
                            onChange={(e) => setDosage(e.target.value)}
                            className="bg-white h-8 text-sm"
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-semibold uppercase text-slate-500">Freq</Label>
                        <Select value={frequency} onValueChange={setFrequency}>
                            <SelectTrigger className="h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1-0-1">1-0-1 (BD)</SelectItem>
                                <SelectItem value="1-0-0">1-0-0 (OD)</SelectItem>
                                <SelectItem value="0-0-1">0-0-1 (Night)</SelectItem>
                                <SelectItem value="1-1-1">1-1-1 (TDS)</SelectItem>
                                <SelectItem value="SOS">SOS (As needed)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-semibold uppercase text-slate-500">Duration</Label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger className="h-8 text-sm bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="3 Days">3 Days</SelectItem>
                                <SelectItem value="5 Days">5 Days</SelectItem>
                                <SelectItem value="7 Days">7 Days</SelectItem>
                                <SelectItem value="15 Days">15 Days</SelectItem>
                                <SelectItem value="1 Month">1 Month</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1">
                        <Button size="sm" onClick={handleAdd} className="h-8 w-full bg-indigo-600 hover:bg-indigo-700 p-0">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* List */}
                <div className="space-y-2">
                    {items.length === 0 ? (
                        <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                            No medications added. Use the form above.
                        </div>
                    ) : (
                        items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-white border rounded-md shadow-sm hover:border-indigo-200 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                                        <Pill className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm text-slate-900">{item.drug} <span className="text-slate-500 font-normal">({item.dosage})</span></div>
                                        <div className="text-xs text-slate-500">{item.frequency} • {item.duration}</div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => handleRemove(i)} className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
