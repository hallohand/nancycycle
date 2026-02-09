'use client';

import { useCycleData } from '@/hooks/useCycleData';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { runEngine } from '@/lib/cycle-calculations';
import { groupCycles } from '@/lib/history-utils';
import { useState, useMemo } from 'react';
import { de } from 'date-fns/locale';
import { Info, Heart, Thermometer, Droplet, Activity, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
    const { data, isLoaded } = useCycleData();
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Calculate Engine (Future) & History (Past)
    const engine = useMemo(() => isLoaded ? runEngine(data) : null, [data, isLoaded]);
    const historyCycles = useMemo(() => isLoaded ? groupCycles(data.entries) : [], [data, isLoaded]);

    const toLocalISO = (d: Date) => {
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - (offset * 60000));
        return local.toISOString().split('T')[0];
    };

    const safeSelectedDateStr = date ? toLocalISO(date) : '';
    const selectedEntry = safeSelectedDateStr ? data.entries[safeSelectedDateStr] : null;

    // --- MODIFIERS CALCULATIONS ---
    const modifiers = useMemo(() => {
        if (!engine) return {};

        const m: any = {
            // Ranges
            period_start: [], period_middle: [], period_end: [], period_single: [],
            predicted_period_start: [], predicted_period_middle: [], predicted_period_end: [], predicted_period_single: [],
            fertile_start: [], fertile_middle: [], fertile_end: [], fertile_single: [],
            predicted_fertile_start: [], predicted_fertile_middle: [], predicted_fertile_end: [], predicted_fertile_single: [],

            // Single Days
            ovulation: [],
            predicted_ovulation: [],
            spotting: [],
            sex: [],
        };

        const addToRange = (start: Date, end: Date, typePrefix: string) => {
            const s = start.getTime();
            const e = end.getTime();

            // Loop through days
            let current = new Date(start);
            while (current <= end) {
                const t = current.getTime();
                const isStart = t === s;
                const isEnd = t === e;

                if (isStart && isEnd) m[`${typePrefix}_single`].push(new Date(current));
                else if (isStart) m[`${typePrefix}_start`].push(new Date(current));
                else if (isEnd) m[`${typePrefix}_end`].push(new Date(current));
                else m[`${typePrefix}_middle`].push(new Date(current));

                current.setDate(current.getDate() + 1);
            }
        };

        const parseDate = (dString: string) => {
            const [y, mo, da] = dString.split('-').map(Number);
            return new Date(y, mo - 1, da);
        };

        // 1. PAST DATA
        historyCycles.forEach(cycle => {
            // Period Range
            // We need to group contiguous period days
            // cycle.days is sorted.
            let rangeStart: Date | null = null;
            let rangeEnd: Date | null = null;

            // Helper to flush period range
            const flushPeriod = () => {
                if (rangeStart && rangeEnd) addToRange(rangeStart, rangeEnd, 'period');
                rangeStart = null; rangeEnd = null;
            };

            // Helper to flush fertile range
            // Actually fertile window is usually continuous in cycle.days if calculated by us.
            // But let's be robust.

            // Iterate days for Period
            cycle.days.forEach((day, idx) => {
                const localDate = parseDate(day.date);

                // Spotting
                if (day.isSpotting) m.spotting.push(localDate);

                // Sex
                if (day.hasSex) m.sex.push(localDate);

                // Ovulation
                if (day.isOvulation) m.ovulation.push(localDate);

                // Period
                if (day.isPeriod) {
                    if (!rangeStart) rangeStart = localDate;
                    rangeEnd = localDate;
                } else {
                    flushPeriod();
                }
            });
            flushPeriod(); // Flush at end of cycle

            // Fertile Window (Past)
            // It might be continuous.
            let fStart: Date | null = null;
            let fEnd: Date | null = null;

            cycle.days.forEach(day => {
                const localDate = parseDate(day.date);
                if (day.isFertile) {
                    if (!fStart) fStart = localDate;
                    fEnd = localDate;
                } else {
                    if (fStart && fEnd) addToRange(fStart, fEnd, 'fertile');
                    fStart = null; fEnd = null;
                }
            });
            if (fStart && fEnd) addToRange(fStart, fEnd, 'fertile');
        });

        // 2. FUTURE DATA
        engine.predictions.futureCycles.forEach(cycle => {
            const parse = (iso: string) => {
                const [y, mo, da] = iso.split('-').map(Number);
                return new Date(y, mo - 1, da);
            };

            // Period
            const pStart = parse(cycle.cycleStart);
            const pEnd = new Date(pStart);
            pEnd.setDate(pEnd.getDate() + (data.periodLength || 5) - 1);
            addToRange(pStart, pEnd, 'predicted_period');

            // Fertile
            const fStart = parse(cycle.fertileStart);
            const fEnd = parse(cycle.fertileEnd);
            addToRange(fStart, fEnd, 'predicted_fertile');

            // Ovulation
            m.predicted_ovulation.push(parse(cycle.ovulationDate));
        });

        return m;
    }, [engine, historyCycles, data.periodLength]);


    const handleDaySelect = (d: Date | undefined) => {
        setDate(d);
        if (d) setIsDetailsOpen(true);
    };

    if (!isLoaded) return <div className="p-8 text-center text-muted-foreground">Laden...</div>;

    const todayPrediction = engine?.predictions.today;
    const todayLabel = todayPrediction
        ? `ZT ${todayPrediction.cycleDay} · ${todayPrediction.phase === 'luteal' ? 'Lutealphase' : todayPrediction.phase === 'follicular' ? 'Follikelphase' : todayPrediction.phase === 'menstruation' ? 'Periode' : 'Eisprungphase'}`
        : 'Keine Daten';

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-[#1a1a1a] text-white overflow-hidden">
            {/* Header / Month Nav is inside Calendar component usually, lets just wrap it carefully */}

            <div className="flex-1 overflow-auto">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDaySelect}
                    locale={de}
                    className="w-full p-0 [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-caption]:justify-between [&_.rdp-caption]:px-4 [&_.rdp-caption]:py-4 [&_.rdp-nav]:px-4"
                    classNames={{
                        head_cell: "text-muted-foreground font-normal text-sm pt-4 pb-2",
                        cell: "p-0 text-center text-sm relative [&:has([aria-selected])]:bg-transparent", // Remove default padding for connected bars
                        day: "h-10 w-full p-0 font-normal aria-selected:opacity-100 relative z-10", // Increase height
                        day_today: "font-bold text-cyan-400 relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-cyan-400 after:rounded-full",
                        day_selected: "bg-white/20 text-white rounded-full",
                    }}
                    modifiers={modifiers}
                    modifiersClassNames={{
                        // Period (Solid Pink)
                        period_start: "bg-pink-600/90 text-white rounded-l-full",
                        period_middle: "bg-pink-600/90 text-white rounded-none",
                        period_end: "bg-pink-600/90 text-white rounded-r-full",
                        period_single: "bg-pink-600/90 text-white rounded-full",

                        // Predicted Period (Dashed Pink?) - Let's use lighter pink opacity
                        predicted_period_start: "bg-pink-900/50 text-pink-200 rounded-l-full border-l border-y border-pink-700/50",
                        predicted_period_middle: "bg-pink-900/50 text-pink-200 rounded-none border-y border-pink-700/50",
                        predicted_period_end: "bg-pink-900/50 text-pink-200 rounded-r-full border-r border-y border-pink-700/50",
                        predicted_period_single: "bg-pink-900/50 text-pink-200 rounded-full border border-pink-700/50",

                        // Fertile (Cyan)
                        fertile_start: "bg-cyan-600/90 text-white rounded-l-full",
                        fertile_middle: "bg-cyan-600/90 text-white rounded-none",
                        fertile_end: "bg-cyan-600/90 text-white rounded-r-full",
                        fertile_single: "bg-cyan-600/90 text-white rounded-full",

                        // Predicted Fertile (Dark Cyan)
                        predicted_fertile_start: "bg-cyan-900/50 text-cyan-200 rounded-l-full border-l border-y border-cyan-700/50",
                        predicted_fertile_middle: "bg-cyan-900/50 text-cyan-200 rounded-none border-y border-cyan-700/50",
                        predicted_fertile_end: "bg-cyan-900/50 text-cyan-200 rounded-r-full border-r border-y border-cyan-700/50",
                        predicted_fertile_single: "bg-cyan-900/50 text-cyan-200 rounded-full border border-cyan-700/50",

                        // Extras
                        ovulation: "after:content-['🌼'] after:absolute after:-top-2 after:right-0 after:text-xs z-20",
                        predicted_ovulation: "after:content-['🌼'] after:opacity-50 after:absolute after:-top-2 after:right-0 after:text-xs z-20",
                        sex: "before:content-['❤️'] before:absolute before:-top-1 before:-left-1 before:text-[8px] z-20",
                        spotting: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-yellow-700 after:rounded-full",
                    }}
                />
            </div>

            {/* Bottom Summary Panel */}
            <div className="bg-[#1a1a1a] border-t border-white/10 p-4 pb-8 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-600"></div> Periode</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-pink-900/50 border border-pink-700"></div> Prognose</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-600"></div> Fruchtbar</div>
                    <div className="flex items-center gap-1.5">🌼 Eisprung</div>
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-gray-400 text-xs">Heute, {new Date().toLocaleDateString('de-DE')}</div>
                        <div className="text-xl font-semibold text-white">{todayLabel}</div>
                    </div>
                    <ChevronRight className="text-gray-600" />
                </div>
            </div>

            {/* Details Sheet / Drawer - Reusing previous logic but styled darker if possible */}
            <Sheet open={isDetailsOpen && !!date} onOpenChange={setIsDetailsOpen}>
                <SheetContent side="bottom" className="h-[50vh] rounded-t-3xl p-6 bg-[#1a1a1a] border-white/10 text-white">
                    <SheetHeader className="pb-4">
                        <SheetTitle className="flex justify-between items-center text-white">
                            <span>{date?.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </SheetTitle>
                        <SheetDescription className="text-gray-400">
                            Tagesdetails & Einträge
                        </SheetDescription>
                    </SheetHeader>

                    {selectedEntry ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-3 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/10">
                                <Thermometer className="w-5 h-5 text-rose-500" />
                                <span className="text-sm font-semibold">{selectedEntry.temperature ? `${selectedEntry.temperature}°C` : '-'}</span>
                                <span className="text-[10px] text-gray-400">Temperatur</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/10">
                                <Activity className="w-5 h-5 text-purple-500" />
                                <span className="text-sm font-semibold">{selectedEntry.lhTest === 'peak' ? 'PEAK' : selectedEntry.lhTest === 'positive' ? '+' : '-'}</span>
                                <span className="text-[10px] text-gray-400">LH Test</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/10">
                                <Droplet className="w-5 h-5 text-blue-500" />
                                <span className="text-sm font-semibold capitalize">{selectedEntry.period === 'spotting' ? 'Schmier' : selectedEntry.period || '-'}</span>
                                <span className="text-[10px] text-gray-400">Blutung</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl flex flex-col items-center justify-center gap-1 border border-white/10">
                                <Heart className={cn("w-5 h-5", selectedEntry.sex ? "text-red-500 fill-red-500" : "text-gray-400")} />
                                <span className="text-sm font-semibold">{selectedEntry.sex ? 'Ja' : 'Nein'}</span>
                                <span className="text-[10px] text-gray-400">GV</span>
                            </div>

                            {selectedEntry.notes && (
                                <div className="col-span-2 bg-yellow-900/20 p-3 rounded-xl border border-yellow-700/30 text-sm italic text-yellow-200">
                                    "{selectedEntry.notes}"
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
                            <Info className="w-8 h-8 opacity-20" />
                            <p>Keine Einträge.</p>
                            <Button variant="outline" size="sm" className="border-white/20 hover:bg-white/10 hover:text-white" onClick={() => window.location.href = `/entry?date=${safeSelectedDateStr}`}>
                                Eintrag hinzufügen
                            </Button>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
