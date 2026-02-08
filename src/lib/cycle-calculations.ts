import { CycleData, CycleEntry } from './types';

export interface PredictionResult {
    nextPeriodStart: Date | null;
    nextPeriodEnd: Date | null;
    period2Start: Date | null;
    period2End: Date | null;
    fertile1Start: Date | null;
    fertile1End: Date | null;
    ovulation1: Date | null;
    fertile2Start: Date | null;
    fertile2End: Date | null;
    ovulation2: Date | null;
    ovulationNext: Date | null;
    ovulationNextAfter: Date | null;
}

export function calculateAverageCycleLength(entries: Record<string, CycleEntry>): number {
    const periodEntries = Object.values(entries)
        .filter((e) => e.period)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (periodEntries.length < 2) return 28;

    let total = 0;
    let count = 0;
    // Calculate diff between consecutive period starts
    // Note: We need to group by "cycle". A period might span multiple days.
    // We only care about the START date of each period block.
    // Simple heuristic: If days diff > 10, it's a new cycle.

    const periodStarts: string[] = [];
    let lastDate = new Date(0);

    for (const entry of periodEntries) {
        const date = new Date(entry.date);
        const diff = (date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff > 10) {
            periodStarts.push(entry.date);
        }
        lastDate = date;
    }

    if (periodStarts.length < 2) return 28;

    for (let i = 1; i < periodStarts.length; i++) {
        const start1 = new Date(periodStarts[i - 1]);
        const start2 = new Date(periodStarts[i]);
        const days = Math.round((start2.getTime() - start1.getTime()) / (1000 * 60 * 60 * 24));

        if (days > 20 && days < 45) { // Sanity check
            total += days;
            count++;
        }
    }

    return count > 0 ? Math.round(total / count) : 28;
}

export function calculatePredictions(data: CycleData): PredictionResult {
    const result: PredictionResult = {
        nextPeriodStart: null, nextPeriodEnd: null,
        period2Start: null, period2End: null,
        fertile1Start: null, fertile1End: null, ovulation1: null,
        fertile2Start: null, fertile2End: null, ovulation2: null,
        ovulationNext: null, ovulationNextAfter: null
    };

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const periodEntries = Object.values(data.entries)
        .filter((e) => e.period)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (periodEntries.length === 0) return result;

    // Find the start of the LAST period
    // We need to group contiguous days logic again or just find the last entry
    // If the last entry is today or yesterday, it's the current period.
    // We want the START of the last period block.

    let lastPeriodEnd = periodEntries[periodEntries.length - 1];
    let lastPeriodStart = lastPeriodEnd;

    // Backtrack to find start of this block
    for (let i = periodEntries.length - 1; i >= 0; i--) {
        const entry = periodEntries[i];
        const prev = periodEntries[i - 1];
        if (!prev) {
            lastPeriodStart = entry;
            break;
        }
        const dayDiff = (new Date(entry.date).getTime() - new Date(prev.date).getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff > 5) { // Gap > 5 days means new period block
            lastPeriodStart = entry;
            break;
        }
        lastPeriodStart = prev; // Keep going back // Bug in logic? 
        // Actually: if I am at index i, and prev is close, then prev is part of same block.
        // If prev is far, then entry is start of block.
    }

    // Re-implemenation of finding last period start properly:
    // Iterate backwards.
    // Current block = [last entry].
    // Check previous entry. If close (<=2 days gap), add to block. Else stop.
    // Start of block is the earliest date in block.

    // Let's use the average cycle length function's logic implicitly?
    // Or just a simple implementation:

    const lastPeriodDate = new Date(lastPeriodStart.date);
    lastPeriodDate.setHours(12, 0, 0, 0);

    const avgCycle = calculateAverageCycleLength(data.entries);
    const lutealPhase = data.lutealPhase || 14;
    const periodLength = data.periodLength || 5;

    // Next period (Period 1)
    const nextPeriod = new Date(lastPeriodDate);
    nextPeriod.setDate(nextPeriod.getDate() + avgCycle);

    // If nextPeriod is in the past (e.g. user hasn't entered data in a while), 
    // we should project forward multiple cycles? 
    // For now, let's stick to the simple logic: Last Period + Cycle Length.
    // If that's in the past, it means "Overdue" or "Missed entry".

    result.nextPeriodStart = new Date(nextPeriod);
    result.nextPeriodEnd = new Date(nextPeriod);
    result.nextPeriodEnd.setDate(result.nextPeriodEnd.getDate() + periodLength - 1);

    // Period 2
    const period2 = new Date(result.nextPeriodEnd);
    // Cycle starts at nextPeriodStart. So next cycle start is nextPeriodStart + avgCycle
    const nextPeriod2 = new Date(nextPeriod);
    nextPeriod2.setDate(nextPeriod2.getDate() + avgCycle);

    result.period2Start = new Date(nextPeriod2);
    result.period2End = new Date(nextPeriod2);
    result.period2End.setDate(result.period2End.getDate() + periodLength - 1);

    // Ovulation 1 (associated with Next Period)
    // Ovulation is roughly Luteal Phase days BEFORE the start of the NEXT period.
    // So for the current cycle (ending at nextPeriod), ovulation is nextPeriod - luteal.
    const ovulation1 = new Date(nextPeriod);
    ovulation1.setDate(ovulation1.getDate() - lutealPhase);
    result.ovulation1 = ovulation1;

    // Ovulation 2 (associated with Period 2)
    const ovulation2 = new Date(nextPeriod2);
    ovulation2.setDate(ovulation2.getDate() - lutealPhase);
    result.ovulation2 = ovulation2;

    // Fertile Windows
    result.fertile1Start = new Date(ovulation1);
    result.fertile1Start.setDate(result.fertile1Start.getDate() - 5);
    result.fertile1End = new Date(ovulation1); // Fertile until ovulation day

    result.fertile2Start = new Date(ovulation2);
    result.fertile2Start.setDate(result.fertile2Start.getDate() - 5);
    result.fertile2End = new Date(ovulation2);

    // Determine "Next" ovulation relative to Today
    if (ovulation1 >= today) {
        result.ovulationNext = ovulation1;
        result.ovulationNextAfter = ovulation2;
    } else if (ovulation2 >= today) {
        result.ovulationNext = ovulation2;
        result.ovulationNextAfter = null;
    } else {
        // Both in past, maybe calculate a 3rd?
        // For now, null or maybe we should project based on today?
        // If deeply in past, user needs to update.
    }

    return result;
}

export function formatDays(days: number): string {
    if (days === 0) return 'Heute';
    if (days === 1) return 'Morgen';
    if (days === -1) return 'Gestern';
    if (days < 0) return `Vor ${Math.abs(days)} Tagen`;
    return `In ${days} Tagen`;
}
