'use client';

import { useCycleData } from '@/hooks/useCycleData';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { runEngine } from '@/lib/cycle-calculations';
import { groupCycles } from '@/lib/history-utils';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { de } from 'date-fns/locale';
import { Info, Heart, Thermometer, Droplet, Activity } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
    const { data, isLoaded } = useCycleData();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Calculate Engine (Future) & History (Past)
    const engine = useMemo(() => isLoaded ? runEngine(data) : null, [data, isLoaded]);
    const historyCycles = useMemo(() => isLoaded ? groupCycles(data.entries) : [], [data, isLoaded]);

    const selectedDateStr = date ? new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0] : '';
    // Fix: toISOString uses UTC. If selected date is local midnight, it might be previous day UTC. 
    // Shadcn Calendar returns local date at 00:00:00. 
    // Best way: use local date string construction YYYY-MM-DD.
    const toLocalISO = (d: Date) => {
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - (offset * 60000));
        return local.toISOString().split('T')[0];
    };

    const safeSelectedDateStr = date ? toLocalISO(date) : '';
    const selectedEntry = safeSelectedDateStr ? data.entries[safeSelectedDateStr] : null;

    // --- MODIFIERS ---
    const modifiers = useMemo(() => {
        if (!engine) return {};

        const m: any = {
            period: [],
            fertile: [],
            ovulation: [],
            sex: [],
            predictedPeriod: [],
            predictedFertile: [],
            predictedOvulation: []
        };

        // 1. PAST DATA (from History Groups)
        historyCycles.forEach(cycle => {
            cycle.days.forEach(day => {
                // day.date is YYYY-MM-DD
                const [y, mo, da] = day.date.split('-').map(Number);
                const localDate = new Date(y, mo - 1, da);

                if (day.isPeriod) m.period.push(localDate);
                else {
                    // Only show fertile/ovulation if not period
                    if (day.isFertile) m.fertile.push(localDate);
                    if (day.isOvulation) m.ovulation.push(localDate);
                }
                if (day.hasSex) m.sex.push(localDate);
            });
        });

        // 2. FUTURE PREDICTIONS (from Engine)
        engine.predictions.futureCycles.forEach(cycle => {
            const parse = (iso: string) => {
                const [y, mo, da] = iso.split('-').map(Number);
                return new Date(y, mo - 1, da);
            };

            // Period (Future)
            for (let i = 0; i < (data.periodLength || 5); i++) {
                const d = parse(cycle.cycleStart);
                d.setDate(d.getDate() + i);
                m.predictedPeriod.push(d);
            }

            // Ovulation (Future)
            m.predictedOvulation.push(parse(cycle.ovulationDate));

            // Fertile Window (Future)
            const fStart = parse(cycle.fertileStart);
            const fEnd = parse(cycle.fertileEnd);
            const current = new Date(fStart);
            while (current <= fEnd) {
                m.predictedFertile.push(new Date(current));
                current.setDate(current.getDate() + 1);
            }
        });

        return m;
    }, [engine, historyCycles, data.periodLength]);


    const handleDaySelect = (d: Date | undefined) => {
        setDate(d);
        if (d) setIsDetailsOpen(true);
    };

    if (!isLoaded) return <div className="p-8 text-center text-muted-foreground">Laden...</div>;

    return (
        <div className="space-y-4 pb-24 h-full flex flex-col">
            <div className="px-4 pt-2">
                <h2 className="text-2xl font-bold tracking-tight">Kalender</h2>
            </div>

            <div className="flex-1 px-2">
                <Card className="border-none shadow-sm h-full flex flex-col overflow-hidden">
                    <CardContent className="p-1 flex-1">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDaySelect}
                            locale={de}
                            className="w-full h-full flex justify-center [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-caption]:justify-between"
                            classNames={{
                                day_today: "bg-accent/50 text-accent-foreground font-bold",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                            }}
                            modifiers={modifiers}
                            modifiersStyles={{
                                period: { backgroundColor: '#fb7185', color: 'white', borderRadius: '0.3rem' }, // rose-400
                                fertile: { backgroundColor: '#a5f3fc', color: '#0e7490', borderRadius: '50%' }, // cyan-200
                                ovulation: { border: '2px solid #fbbf24', backgroundColor: '#fef3c7', borderRadius: '50%', color: '#b45309' }, // amber
                                predictedPeriod: { border: '1px dashed #fb7185', color: '#e11d48', borderRadius: '0.3rem' },
                                predictedFertile: { backgroundColor: '#ecfeff', border: '1px dashed #22d3ee', borderRadius: '50%' },
                            }}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Details Sheet / Drawer */}
            <Sheet open={isDetailsOpen && !!date} onOpenChange={setIsDetailsOpen}>
                <SheetContent side="bottom" className="h-[50vh] rounded-t-3xl p-6">
                    <SheetHeader className="pb-4">
                        <SheetTitle className="flex justify-between items-center">
                            <span>{date?.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </SheetTitle>
                        <SheetDescription>
                            Tagesdetails & Einträge
                        </SheetDescription>
                    </SheetHeader>

                    {selectedEntry ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-muted/50 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
                                <Thermometer className="w-5 h-5 text-rose-500" />
                                <span className="text-sm font-semibold">{selectedEntry.temperature ? `${selectedEntry.temperature}°C` : '-'}</span>
                                <span className="text-[10px] text-muted-foreground">Temperatur</span>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
                                <Activity className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold">{selectedEntry.lhTest === 'peak' ? 'PEAK' : selectedEntry.lhTest === 'positive' ? '+' : '-'}</span>
                                <span className="text-[10px] text-muted-foreground">LH Test</span>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
                                <Droplet className="w-5 h-5 text-blue-500" />
                                <span className="text-sm font-semibold capitalize">{selectedEntry.period === 'spotting' ? 'Schmier' : selectedEntry.period || '-'}</span>
                                <span className="text-[10px] text-muted-foreground">Blutung</span>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-xl flex flex-col items-center justify-center gap-1">
                                <Heart className={cn("w-5 h-5", selectedEntry.sex ? "text-red-500 fill-red-500" : "text-gray-400")} />
                                <span className="text-sm font-semibold">{selectedEntry.sex ? 'Ja' : 'Nein'}</span>
                                <span className="text-[10px] text-muted-foreground">Geschlechtsverkehr</span>
                            </div>

                            {selectedEntry.notes && (
                                <div className="col-span-2 bg-yellow-50/50 p-3 rounded-xl border border-yellow-100 text-sm italic">
                                    "{selectedEntry.notes}"
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                            <Info className="w-8 h-8 opacity-20" />
                            <p>Keine Einträge für diesen Tag.</p>
                            <Button variant="outline" size="sm" onClick={() => window.location.href = `/entry?date=${safeSelectedDateStr}`}>
                                Eintrag hinzufügen
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
