'use client';
import { useCycleData } from '@/hooks/useCycleData';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { runEngine } from '@/lib/cycle-calculations';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { de } from 'date-fns/locale';

export default function CalendarPage() {
    const { data } = useCycleData();
    const [date, setDate] = useState<Date | undefined>(new Date());

    const engine = runEngine(data);
    const selectedDateStr = date?.toISOString().split('T')[0];
    const selectedEntry = selectedDateStr ? data.entries[selectedDateStr] : null;

    // Modifiers arrays
    const periodDays: Date[] = [];
    const sexDays: Date[] = [];
    const lhPeakDays: Date[] = [];
    const ovulationDays: Date[] = []; // Confirmed or past predicted

    // Future Predictions (Ghost)
    const predictedPeriodDays: Date[] = [];
    const predictedFertileDays: Date[] = [];
    const predictedOvulationDays: Date[] = [];

    // 1. Populate from history
    Object.values(data.entries).forEach(e => {
        const d = new Date(e.date);
        if (e.period) periodDays.push(d);
        if (e.sex) sexDays.push(d);
        if (e.lhTest === 'peak' || e.lhTest === 'positive') lhPeakDays.push(d);
    });

    // 2. Confirmed Ovulation (Current Cycle)
    if (engine.currentCycle.ovulationConfirmedDate) {
        ovulationDays.push(new Date(engine.currentCycle.ovulationConfirmedDate));
    }

    // 3. Populate Future Cycles (6 Months)
    engine.predictions.futureCycles.forEach(cycle => {
        // Period
        for (let i = 0; i < (data.periodLength || 5); i++) {
            const d = new Date(cycle.cycleStart);
            d.setDate(d.getDate() + i);
            predictedPeriodDays.push(new Date(d));
        }

        // Ovulation
        predictedOvulationDays.push(new Date(cycle.ovulationDate));

        // Fertile Window
        const fStart = new Date(cycle.fertileStart);
        const fEnd = new Date(cycle.fertileEnd);
        // Iterate dates
        const current = new Date(fStart);
        while (current <= fEnd) {
            predictedFertileDays.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
    });

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-sm">
                <CardContent className="p-0 flex justify-center">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        locale={de}
                        modifiers={{
                            period: periodDays,
                            ovulation: ovulationDays,
                            sex: sexDays,
                            lh: lhPeakDays,
                            // Future / Predictions
                            predictedPeriod: predictedPeriodDays,
                            predictedFertile: predictedFertileDays,
                            predictedOvulation: predictedOvulationDays
                        }}
                        modifiersClassNames={{
                            period: 'bg-primary text-primary-foreground font-bold hover:bg-primary/90 rounded-md',
                            ovulation: 'bg-green-500 text-white font-bold border-2 border-green-600 rounded-full',
                            sex: 'after:content-["❤️"] after:absolute after:-top-1 after:-right-1 after:text-[8px]',
                            lh: 'border-2 border-purple-500',

                            // Lighter styles for predictions
                            predictedPeriod: 'bg-primary/10 text-primary border border-dashed border-primary/30 rounded-md',
                            predictedFertile: 'bg-green-50 text-green-600/70',
                            predictedOvulation: 'border-2 border-green-300 rounded-full text-green-600/70'
                        }}
                        className="rounded-xl border shadow-sm p-4 bg-white"
                    />
                </CardContent>
            </Card>

            {/* Detail View for Selected Date */}
            <Card className="border-none bg-muted/30">
                <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base font-medium">
                        {date?.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {selectedEntry ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2">
                                {selectedEntry.temperature && <Badge variant="outline" className="bg-background">{selectedEntry.temperature}°C {selectedEntry.excludeTemp && '(Ausgeklammert)'}</Badge>}
                                {selectedEntry.period && <Badge className="bg-primary/20 text-primary hover:bg-primary/30">Periode: {selectedEntry.period}</Badge>}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {selectedEntry.lhTest && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">LH: {selectedEntry.lhTest}</Badge>}
                                {selectedEntry.sex && <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200">GV: {selectedEntry.sex === 'unprotected' ? 'Ungeschützt' : 'Geschützt'}</Badge>}
                                {selectedEntry.cervix && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Schleim: {selectedEntry.cervix}</Badge>}
                            </div>

                            {selectedEntry.notes && <p className="text-sm text-muted-foreground mt-1 bg-white/50 p-2 rounded-lg">{selectedEntry.notes}</p>}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground text-center py-4">Keine Einträge für diesen Tag.</div>
                    )}
                </CardContent>
            </Card>

            <div className="flex gap-4 justify-center text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-400 rounded-full"></div> LH</div>
                <div className="flex items-center gap-1">❤️ GV</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 rounded-full"></div> Fruchtbar</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-primary/20 border border-dashed border-primary rounded-full"></div> Prognose</div>
            </div>
        </div>
    );
}
