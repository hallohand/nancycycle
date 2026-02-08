import { CycleData, CycleEntry } from './types';

interface CycleAnalysis {
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
    cycleLength?: number;
    ovulationDay?: string; // Confirmed or Predicted
    isOvulationConfirmed: boolean;
    fertileWindowStart?: string;
    fertileWindowEnd?: string;
    coverline?: number;
    phase: 'menstruation' | 'follicular' | 'luteal' | 'unknown';
}

export interface PredictionResult {
    nextPeriodStart: Date | null;
    ovulationNext: Date | null;
    fertileWindowStart: Date | null;
    fertileWindowEnd: Date | null;
    currentPhase: string;
    isOvulationConfirmed: boolean;
    daysToNextPeriod: number | null; // Helper
    cycleDay: number;
}

export function formatDays(days: number): string {
    if (days === 0) return 'Heute';
    if (days === 1) return 'Morgen';
    if (days === -1) return 'Gestern';
    if (days < 0) return `Vor ${Math.abs(days)} Tagen`;
    return `In ${days} Tagen`;
}

// Helper: Get sorted entries
function getSortedEntries(entries: Record<string, CycleEntry>): CycleEntry[] {
    return Object.values(entries).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Helper: Group entries into cycles
function analyzeCycles(data: CycleData): CycleAnalysis[] {
    const sorted = getSortedEntries(data.entries);
    const cycles: CycleAnalysis[] = [];

    if (sorted.length === 0) return [];

    let currentCycle: CycleAnalysis | null = null;
    let entriesInCycle: CycleEntry[] = [];

    // Iterate chronologically
    for (let i = 0; i < sorted.length; i++) {
        const entry = sorted[i];
        const prevEntry = i > 0 ? sorted[i - 1] : null;

        // Detect Cycle Start (First day of bleeding, if gap > 5 days or prev had no bleeding)
        const isPeriodStart = entry.period && (!prevEntry?.period || (new Date(entry.date).getTime() - new Date(prevEntry.date).getTime() > 1000 * 60 * 60 * 24 * 5));

        if (isPeriodStart) {
            // Close previous cycle
            if (currentCycle) {
                currentCycle.endDate = prevEntry?.date; // Last recorded date before new cycle
                // Calculate length
                const start = new Date(currentCycle.startDate);
                const end = new Date(entry.date); // Use new cycle start as cut-off
                // Length is newStart - oldStart (in days)
                currentCycle.cycleLength = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                currentCycle.isCurrent = false;

                // Analyze finished cycle (Ovulation check, etc.)
                analyzeSingleCycle(currentCycle, entriesInCycle, data.lutealPhase);
                cycles.push(currentCycle);
            }

            // Start new cycle
            currentCycle = {
                startDate: entry.date,
                isCurrent: true,
                isOvulationConfirmed: false,
                phase: 'menstruation'
            };
            entriesInCycle = [];
        }

        if (currentCycle) {
            entriesInCycle.push(entry);
        }
    }

    // Add final (current) cycle
    if (currentCycle) {
        analyzeSingleCycle(currentCycle, entriesInCycle, data.lutealPhase);
        cycles.push(currentCycle);
    }

    return cycles;
}

// Logic: Determine Ovulation in a specific cycle
function analyzeSingleCycle(cycle: CycleAnalysis, entries: CycleEntry[], lutealPhase: number) {
    // 1. Check for LH Peak
    // If multiple positives, the *last* positive or peak is often used, or the first peak.
    // Standard rule: Ovulation 24-36h after *first* positive LH test.
    const lhPeakEntry = entries.find(e => e.lhTest === 'peak' || e.lhTest === 'positive');
    let lhOvulationDate: Date | null = null;
    if (lhPeakEntry) {
        const d = new Date(lhPeakEntry.date);
        d.setDate(d.getDate() + 1); // Approx 1 day after positive test
        lhOvulationDate = d;
    }

    // 2. Check BBT Shift (NFP Standard: 3 over 6)
    // Find a sequence where 3 consective temps are higher than max of previous 6
    let bbtOvulationDate: Date | null = null;
    let coverline: number | null = null;

    // Filter valid temps
    const tempEntries = entries.filter(e => e.temperature && !e.excludeTemp && new Date(e.date) >= new Date(cycle.startDate));

    // Need at least 9 days of data (6 low + 3 high)
    for (let i = 6; i < tempEntries.length - 2; i++) {
        const potentialShift = tempEntries[i];
        const prev6 = tempEntries.slice(i - 6, i);
        const next2 = tempEntries.slice(i + 1, i + 3); // Need 3 high temps total (current + next 2)

        const maxPrev6 = Math.max(...prev6.map(e => e.temperature!));

        // Rule: 1st high temp > maxPrev6 + 0.05 (strict) or ust > max (simple)
        // Simple NFP: 3rd high temp must be 0.2 higher than coverline
        // Coverline = maxPrev6
        const isShift = [potentialShift, ...next2].every(e => e.temperature! > maxPrev6);

        if (isShift) {
            // Found shift! Ovulation likely day BEFORE first high temp
            const shiftDate = new Date(potentialShift.date);
            shiftDate.setDate(shiftDate.getDate() - 1);
            bbtOvulationDate = shiftDate;
            coverline = maxPrev6;
            break; // Stop at first shift
        }
    }

    // Conclude Calculation
    if (bbtOvulationDate) {
        cycle.ovulationDay = bbtOvulationDate.toISOString().split('T')[0];
        cycle.isOvulationConfirmed = true;
        cycle.coverline = coverline || undefined;
    } else if (lhOvulationDate) {
        cycle.ovulationDay = lhOvulationDate.toISOString().split('T')[0];
        cycle.isOvulationConfirmed = false; // LH predicts, but doesn't confirm like temp
        // Keep as 'predicted' but high confidence
    } else {
        // Fallback: Calendar Calculation using Luteal Phase
        // Only if cycle is finished (we have length) or we are predicting future
        if (cycle.cycleLength) {
            const start = new Date(cycle.startDate);
            start.setDate(start.getDate() + cycle.cycleLength - lutealPhase);
            cycle.ovulationDay = start.toISOString().split('T')[0];
        }
    }

    // Fertile Window: Ovu - 5 to Ovu + 1
    if (cycle.ovulationDay) {
        const ovu = new Date(cycle.ovulationDay);
        const start = new Date(ovu); start.setDate(start.getDate() - 5);
        const end = new Date(ovu); end.setDate(end.getDate() + 1);
        cycle.fertileWindowStart = start.toISOString().split('T')[0];
        cycle.fertileWindowEnd = end.toISOString().split('T')[0];
    }
}

export function calculateAverageCycleLength(entries: Record<string, CycleEntry>): number {
    // This needs cycle analysis logic too
    // For now simple heuristic or reuse analyzeCycles
    // We can't use analyzeCycles here easily without data object structure match, but we passed entries.
    // Let's rely on data.cycleLength from state or calc simple avg
    return 28; // Placeholder, real avg calculation should be done in analyzeCycles and stored
}

export function calculatePredictions(data: CycleData): PredictionResult {
    const cycles = analyzeCycles(data);
    const currentCycle = cycles[cycles.length - 1]; // Last one
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!currentCycle) {
        return {
            nextPeriodStart: null, ovulationNext: null, fertileWindowStart: null, fertileWindowEnd: null,
            currentPhase: 'unknown', isOvulationConfirmed: false, daysToNextPeriod: null, cycleDay: 0
        };
    }

    const start = new Date(currentCycle.startDate);
    const cycleDay = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Determining Next Period
    let nextPeriodStart = new Date(start);
    // If we have confirmed ovulation, period is Ovu + Luteal
    if (currentCycle.ovulationDay && currentCycle.isOvulationConfirmed) {
        const ovu = new Date(currentCycle.ovulationDay);
        nextPeriodStart = new Date(ovu);
        nextPeriodStart.setDate(nextPeriodStart.getDate() + data.lutealPhase);
    } else {
        // Fallback: Average length
        nextPeriodStart.setDate(nextPeriodStart.getDate() + (data.cycleLength || 28));
    }

    // Determining Ovulation (Future or Past)
    let ovulationDate: Date | null = null;
    let isConfirmed = false;

    if (currentCycle.ovulationDay) {
        ovulationDate = new Date(currentCycle.ovulationDay);
        isConfirmed = currentCycle.isOvulationConfirmed;
    } else {
        // Predict future ovulation
        const predictedOvu = new Date(nextPeriodStart);
        predictedOvu.setDate(predictedOvu.getDate() - data.lutealPhase);
        ovulationDate = predictedOvu;
    }

    // Phase Calculation
    let phase = 'follicular';
    if (cycleDay <= (data.periodLength || 5)) phase = 'menstruation';
    else if (ovulationDate && today > ovulationDate) phase = 'luteal';
    else if (currentCycle.fertileWindowStart && currentCycle.fertileWindowEnd) {
        const fStart = new Date(currentCycle.fertileWindowStart);
        const fEnd = new Date(currentCycle.fertileWindowEnd);
        if (today >= fStart && today <= fEnd) phase = 'ovulatory'; // Fertile
    }

    return {
        nextPeriodStart,
        ovulationNext: ovulationDate,
        fertileWindowStart: currentCycle.fertileWindowStart ? new Date(currentCycle.fertileWindowStart) : null,
        fertileWindowEnd: currentCycle.fertileWindowEnd ? new Date(currentCycle.fertileWindowEnd) : null,
        currentPhase: phase,
        isOvulationConfirmed: isConfirmed,
        daysToNextPeriod: Math.ceil((nextPeriodStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        cycleDay
    };
}
