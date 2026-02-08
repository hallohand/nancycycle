'use client';
import { useCycleData } from '@/hooks/useCycleData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { runEngine } from '@/lib/cycle-calculations';
import { CycleEntry } from '@/lib/types';
import { useState, useEffect } from 'react';

export default function HistoryPage() {
    const { data, isLoaded } = useCycleData();
    const [displayCycles, setDisplayCycles] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ medianCycleLength: 28 });

    useEffect(() => {
        if (!isLoaded) return;

        const engine = runEngine(data);
        setStats(engine.statistics);

        const entries = Object.values(data.entries).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Oldest first (Chronological)

        const cycles: any[] = [];
        let currentGroup: { startDate: string, entries: CycleEntry[] } | null = null;

        entries.forEach((e, i) => {
            const prev = i > 0 ? entries[i - 1] : null;
            // A new cycle starts if we have a period entry, AND it's been a while since last period entry
            // Or if it's explicitly marked as start (we don't have explicit marker, infer from period)

            const isPeriodStart = e.period && (!prev?.period || (new Date(e.date).getTime() - new Date(prev.date).getTime() > 1000 * 60 * 60 * 24 * 10)); // Gap > 10 days

            if (isPeriodStart || !currentGroup) {
                if (currentGroup) {
                    cycles.push(currentGroup);
                }
                currentGroup = { startDate: e.date, entries: [] };
            }

            if (currentGroup) {
                currentGroup.entries.push(e);
            }
        });

        if (currentGroup) cycles.push(currentGroup);

        // Process lengths
        const processed = cycles.map((c, i) => {
            let endDate = null;
            let length = 0;

            if (i < cycles.length - 1) {
                const next = cycles[i + 1];
                length = Math.round((new Date(next.startDate).getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24));
                const d = new Date(next.startDate);
                d.setDate(d.getDate() - 1);
                endDate = d.toISOString().split('T')[0];
            } else {
                // Last cycle
                const today = new Date();
                length = Math.round((today.getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                endDate = null; // Ongoing
            }

            return { ...c, length, endDate };
        }).reverse(); // Newest first

        setDisplayCycles(processed);

    }, [data, isLoaded]);

    if (!isLoaded) return <div className="p-8 text-center text-muted-foreground">Laden...</div>;

    return (
        <div className="space-y-4 pb-24 h-full flex flex-col">
            <div className="px-4 pt-4">
                <h2 className="text-2xl font-bold tracking-tight">Verlauf</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 px-4">
                <Card className="border-none shadow-sm bg-white text-center py-2 h-auto">
                    <CardContent className="p-2">
                        <div className="text-2xl font-bold text-primary">{Math.round(stats.medianCycleLength)}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ø Tage / Zyklus</div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-white text-center py-2 h-auto">
                    <CardContent className="p-2">
                        <div className="text-2xl font-bold">{data.periodLength || 5}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Ø Tage / Periode</div>
                    </CardContent>
                </Card>
            </div>

            <ScrollArea className="flex-1 px-4">
                <div className="space-y-3 pb-4">
                    {displayCycles.map((cycle, i) => (
                        <Card key={i} className={`overflow-hidden border-none shadow-sm transition-colors ${i === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-white hover:bg-muted/10'}`}>
                            <CardHeader className="p-3 bg-muted/10 flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <div className="text-sm font-semibold text-primary/80">
                                        {new Date(cycle.startDate).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                                        {i === 0 && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wide">Aktuell</span>}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        {new Date(cycle.startDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                                        {cycle.endDate ? ` — ${new Date(cycle.endDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}` : ' — Heute'}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xl font-bold text-slate-700">{cycle.length}</span>
                                    <span className="text-[9px] text-muted-foreground uppercase">Tage</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 flex gap-2 flex-wrap min-h-[40px] items-center">
                                {/* Summary Chips */}
                                {cycle.entries.some((e: any) => e.lhTest === 'peak' || e.lhTest === 'positive') && (
                                    <span className="text-[10px] font-medium bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div> LH Peak
                                    </span>
                                )}
                                {cycle.entries.some((e: any) => e.temperature && !e.excludeTemp) && (
                                    <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Temp
                                    </span>
                                )}
                                {cycle.entries.some((e: any) => e.sex) && (
                                    <span className="text-[10px] font-medium bg-rose-50 text-rose-700 px-2 py-1 rounded-md border border-rose-100 flex items-center gap-1">
                                        ❤️ GV
                                    </span>
                                )}
                                {cycle.entries.every((e: any) => !e.lhTest && !e.temperature && !e.sex) && (
                                    <span className="text-[10px] text-muted-foreground italic pl-1">Keine Details</span>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
