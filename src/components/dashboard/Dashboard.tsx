'use client';
import { useCycleData } from '@/hooks/useCycleData';
import { calculatePredictions, formatDays, calculateAverageCycleLength } from '@/lib/cycle-calculations';
import { StatusCard } from './StatusCard';
import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
    const { data, isLoaded } = useCycleData();
    const [today, setToday] = useState<Date | null>(null);

    useEffect(() => {
        setToday(new Date());
    }, []);

    if (!isLoaded || !today) {
        return <div className="flex justify-center p-10 text-pink-500">Laden...</div>;
    }

    const predictions = calculatePredictions(data);
    const todaysDateStr = today.toISOString().split('T')[0];
    const todayEntry = data.entries[todaysDateStr];

    // Cycle Day Calculation
    const periodEntries = Object.values(data.entries)
        .filter(e => e.period)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const lastPeriod = periodEntries.length > 0 ? periodEntries[periodEntries.length - 1] : null;
    let cycleDay = 0;
    if (lastPeriod) {
        const lastPeriodDate = new Date(lastPeriod.date);
        // Diff in days + 1
        cycleDay = Math.floor((today.getTime() - lastPeriodDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // Formatting strings
    const daysToPeriod = predictions.nextPeriodStart
        ? Math.ceil((predictions.nextPeriodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const daysToOvulation = predictions.ovulationNext
        ? Math.ceil((predictions.ovulationNext.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    // Determining main status (Fertility/Period)
    let status = { label: 'Status', value: 'Normal', hint: 'Niedrige Fruchtbarkeit', class: '', icon: '😌' };

    if (cycleDay > 0 && cycleDay <= 5) {
        status = { label: 'Periode', value: 'Menstruation', hint: `Zyklustag ${cycleDay}`, class: 'bg-pink-50 border-pink-400', icon: '🩸' };
    } else if (todayEntry?.lhTest === 'positive') {
        status = { label: 'Fruchtbarkeit', value: 'Peak', hint: 'LH-Test Positiv', class: 'bg-orange-50 border-orange-400', icon: '🔥' };
    } else if (daysToOvulation !== null && daysToOvulation >= -1 && daysToOvulation <= 1) {
        status = { label: 'Fruchtbarkeit', value: 'Sehr Hoch', hint: 'Eisprung steht bevor', class: 'bg-green-50 border-green-400', icon: '🥚' };
    } else if (daysToOvulation !== null && daysToOvulation > 1 && daysToOvulation <= 5) {
        status = { label: 'Fruchtbarkeit', value: 'Fruchtbar', hint: `Eisprung in ${daysToOvulation} Tagen`, class: 'bg-green-50 border-green-200', icon: '🌱' };
    }

    return (
        <motion.div
            className="space-y-4"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* Main Status */}
            <motion.div variants={item} className={`rounded-3xl p-6 text-center shadow-sm border-2 transition-all ${status.class || 'bg-white border-transparent'}`}>
                <motion.div
                    className="text-5xl mb-3 inline-block"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    {status.icon}
                </motion.div>
                <div className="text-2xl font-bold text-gray-800">{status.value}</div>
                <div className="text-sm text-gray-500 mt-1">{status.hint}</div>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
                <motion.div variants={item}>
                    <StatusCard
                        label="Zyklustag"
                        value={cycleDay > 0 ? cycleDay : '-'}
                        hint={lastPeriod ? 'Seit letzter Periode' : 'Keine Daten'}
                    />
                </motion.div>

                <motion.div variants={item}>
                    <StatusCard
                        label="Nächste Periode"
                        value={daysToPeriod !== null ? formatDays(daysToPeriod) : '-'}
                        hint={predictions.nextPeriodStart?.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) || ''}
                        className={daysToPeriod !== null && daysToPeriod <= 3 ? 'border-pink-300 bg-pink-50' : ''}
                    />
                </motion.div>

                <motion.div variants={item}>
                    <StatusCard
                        label="Nächster Eisprung"
                        value={daysToOvulation !== null ? formatDays(daysToOvulation) : '-'}
                        hint={predictions.ovulationNext?.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) || ''}
                        className={daysToOvulation !== null && Math.abs(daysToOvulation) <= 2 ? 'border-green-300 bg-green-50' : ''}
                    />
                </motion.div>

                <motion.div variants={item}>
                    <StatusCard label="Ø Zyklus" value={`${calculateAverageCycleLength(data.entries)} Tage`} />
                </motion.div>
            </div>

            {/* Quick Actions / Today's Entry Summary */}
            {todayEntry && (
                <motion.div variants={item} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-3 font-medium">Heute eingetragen</div>
                    <div className="flex flex-wrap gap-2">
                        {todayEntry.temperature && <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded-lg text-sm font-medium">{todayEntry.temperature}°C</span>}
                        {todayEntry.period && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">Periode: {todayEntry.period}</span>}
                        {todayEntry.lhTest && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">LH: {todayEntry.lhTest}</span>}
                        {todayEntry.cervix && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">{todayEntry.cervix}</span>}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
