'use client';
import { useCycleData } from '@/hooks/useCycleData';
import { calculatePredictions, formatDays, calculateAverageCycleLength } from '@/lib/cycle-calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Plus, Calendar as CalendarIcon, Activity, Droplets, Thermometer, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Progress } from "@/components/ui/progress"

export default function Dashboard() {
    const { data, isLoaded } = useCycleData();
    const [today, setToday] = useState<Date | null>(null);

    useEffect(() => {
        setToday(new Date());
    }, []);

    if (!isLoaded || !today) return <div className="p-8 text-center text-muted-foreground animate-pulse">Lade CycleTrack...</div>;

    const predictions = calculatePredictions(data);
    const todaysDateStr = today.toISOString().split('T')[0];
    const todayEntry = data.entries[todaysDateStr];

    const daysToPeriod = predictions.nextPeriodStart
        ? Math.ceil((predictions.nextPeriodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const daysToOvulation = predictions.ovulationNext
        ? Math.ceil((predictions.ovulationNext.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    // Status Logic
    let status = { title: 'Zyklus-Phase', subtitle: 'Follikelphase', color: 'bg-secondary', text: 'text-secondary-foreground', icon: Activity };

    if (predictions.currentPhase === 'menstruation') {
        status = { title: 'Periode', subtitle: `Tag ${predictions.cycleDay}`, color: 'bg-primary/10', text: 'text-primary', icon: Droplets };
    } else if (predictions.currentPhase === 'ovulatory') {
        const isPeak = todayEntry?.lhTest === 'peak';
        status = {
            title: 'Fruchtbar',
            subtitle: isPeak ? 'Maximale Chance' : 'Hohe Chance',
            color: isPeak ? 'bg-purple-100' : 'bg-green-100',
            text: isPeak ? 'text-purple-700' : 'text-green-700',
            icon: Thermometer
        };
    } else if (predictions.currentPhase === 'luteal') {
        status = {
            title: 'Lutealphase',
            subtitle: predictions.isOvulationConfirmed ? 'Eisprung bestätigt' : 'Nach Eisprung',
            color: 'bg-orange-50',
            text: 'text-orange-700',
            icon: predictions.isOvulationConfirmed ? CheckCircle2 : Activity
        };
    }

    // Custom suggestion / Warning
    let suggestion = "";
    if (predictions.isOvulationConfirmed) {
        suggestion = "Temperaturanstieg erkannt. Fruchtbares Fenster geschlossen.";
    } else if (todayEntry?.lhTest === 'positive' || todayEntry?.lhTest === 'peak') {
        suggestion = "LH-Anstieg! Eisprung voraussichtlich in 24-36h.";
    } else if (daysToOvulation !== null && daysToOvulation > 0 && daysToOvulation <= 3) {
        suggestion = "Fruchtbare Tage beginnen. Beste Chance für GV.";
    }

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };
    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 pb-24">

            {/* 1. Main Status Card */}
            <motion.div variants={item} className="col-span-1 row-span-1">
                <Card className={`h-full border-none shadow-sm ${status.color}`}>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className={status.text}>{status.title}</CardDescription>
                        <CardTitle className={`text-xl font-bold ${status.text} leading-tight`}>{status.subtitle}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <status.icon className={`h-8 w-8 ${status.text} opacity-80`} />
                    </CardContent>
                </Card>
            </motion.div>

            {/* 2. Quick Action / Prediction */}
            <motion.div variants={item} className="col-span-1 row-span-1">
                <Card className="h-full shadow-sm border p-4 flex flex-col justify-between">
                    <div className="text-xs text-muted-foreground uppercase">Nächste Periode</div>
                    <div className="text-2xl font-bold text-primary">
                        {daysToPeriod !== null ? daysToPeriod : '?'} <span className="text-sm font-normal text-muted-foreground">Tage</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {predictions.nextPeriodStart ? predictions.nextPeriodStart.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : '-'}
                    </div>
                </Card>
            </motion.div>

            {/* 3. Suggestion / Warning Box */}
            {suggestion && (
                <motion.div variants={item} className="col-span-2">
                    <div className={`p-3 rounded-xl border flex items-start gap-3 ${predictions.isOvulationConfirmed ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                        {predictions.isOvulationConfirmed ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                        <span className="text-sm font-medium">{suggestion}</span>
                    </div>
                </motion.div>
            )}

            {/* 4. Cycle Progress */}
            <motion.div variants={item} className="col-span-2">
                <Card className="shadow-sm border-none bg-white">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base flex justify-between">
                            <span>Zyklus-Fortschritt</span>
                            <span className="text-muted-foreground font-normal">Tag {predictions.cycleDay}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                        <Progress value={Math.min(((predictions.cycleDay) / (data.cycleLength || 28)) * 100, 100)} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>Tag 1</span>
                            <span>~Tag {data.cycleLength || 28}</span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* 5. Today's Log Summary */}
            {todayEntry && (
                <motion.div variants={item} className="col-span-2">
                    <Card className="bg-muted/30 border-none">
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-sm font-medium">Heute</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 flex flex-wrap gap-2">
                            {todayEntry.temperature && <Badge variant="outline" className="bg-background">{todayEntry.temperature}°C {todayEntry.excludeTemp ? '(Ignoriert)' : ''}</Badge>}
                            {todayEntry.period && <Badge variant="secondary" className="bg-primary/20 text-primary">{todayEntry.period}</Badge>}
                            {todayEntry.lhTest && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">LH: {todayEntry.lhTest}</Badge>}
                            {todayEntry.sex && <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200">{todayEntry.sex === 'unprotected' ? '❤️ GV' : '🛡️ GV'}</Badge>}
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </motion.div>
    );
}
