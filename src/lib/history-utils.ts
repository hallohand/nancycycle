import { CycleEntry } from '@/lib/types';

export interface CycleGroup {
    id: string;
    startDate: string;
    endDate?: string;
    length?: number;
    periodLength: number;
    entries: CycleEntry[];
    days: {
        date: string;
        isPeriod: boolean;
        isFertile: boolean;
        isOvulation: boolean;
        hasSex: boolean;
    }[];
}

// Helper: Parse YYYY-MM-DD as Local Date at Noon to avoid Timezone shifts
function parseDateSafe(dateStr: string): Date {
    // Append T12:00:00 to ensure we are in the middle of the day, 
    // avoiding midnight shifts due to T00:00:00Z being previous day in Western hemisphere 
    // or T00:00:00 Local being shifted if not careful.
    // Actually: new Date('YYYY-MM-DD') is UTC.
    // We want to work with timestamps that represent differences in DAYS reliably.
    // Best way: treat everything as UTC for calculation, or force Noon Local.

    // Let's use UTC for calculations to be safe from DST shifts too.
    const d = new Date(dateStr);
    // This is UTC midnight.
    return d;
}

function diffDays(d1: string, d2: string): number {
    const t1 = parseDateSafe(d1).getTime();
    const t2 = parseDateSafe(d2).getTime();
    return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
}

function addDays(dateStr: string, days: number): string {
    const d = parseDateSafe(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}


export function groupCycles(entriesMap: Record<string, CycleEntry>): CycleGroup[] {
    const entries = Object.values(entriesMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const cycles: CycleGroup[] = [];

    let currentEntries: CycleEntry[] = [];
    let currentStart = '';
    let lastPeriodDateInCurrentCycle: string | null = null;

    const finishCycle = (end: string | undefined, nextStart: string | undefined) => {
        if (!currentStart) return;

        let length = 0;
        let endDate = end;

        if (nextStart) {
            length = diffDays(nextStart, currentStart);
            endDate = addDays(nextStart, -1);
        } else {
            const today = new Date().toISOString().split('T')[0];
            // If today < currentStart (impossible if sorted, but safety)
            if (diffDays(today, currentStart) < 0) {
                length = currentEntries.length; // Fallback
            } else {
                length = diffDays(today, currentStart) + 1;
            }
        }

        const periodLength = currentEntries.filter(e => e.period).length;

        const visDays = [];
        for (let i = 0; i < length; i++) {
            const iso = addDays(currentStart, i);
            const entry = entriesMap[iso];

            const isPeriod = !!entry?.period;

            let isOvulation = false;
            let isFertile = false;

            const ovuDayIndex = length - 14;
            if (length > 20) {
                if (i === ovuDayIndex - 1) isOvulation = true;
                if (i >= ovuDayIndex - 5 && i <= ovuDayIndex) isFertile = true;
            }

            if (entry?.lhTest === 'peak') isOvulation = true;

            visDays.push({
                date: iso,
                isPeriod,
                isFertile: isFertile && !isPeriod,
                isOvulation,
                hasSex: !!entry?.sex
            });
        }

        cycles.push({
            id: currentStart,
            startDate: currentStart,
            endDate,
            length,
            periodLength,
            entries: currentEntries,
            days: visDays
        });
    }

    entries.forEach((e, i) => {
        let isNewCycle = false;

        if (e.period) {
            // Ignore 'spotting' as cycle starter?
            // User feedback is key. Usually Spotting is NOT Day 1.
            // Let's prevent spotting from STARTING a new cycle, unless it's the only thing we have.
            // But if we are in a cycle, spotting is just part of it.

            const isSpotting = e.period === 'spotting';

            if (!currentStart) {
                // If strictly spotting at very beginning, maybe wait? 
                // But for now, any period starts the first cycle.
                isNewCycle = true;
            } else {
                const dayDiff = diffDays(e.date, currentStart);

                // Rule 1: Must be > 14 days from start
                if (dayDiff < 14) {
                    isNewCycle = false;
                } else {
                    // Rule 2: Must be > 10 days from last recorded period flow
                    const lastPeriodGap = lastPeriodDateInCurrentCycle
                        ? diffDays(e.date, lastPeriodDateInCurrentCycle)
                        : dayDiff;

                    if (lastPeriodGap > 10) {
                        // It qualifies time-wise.
                        // Check if it is just 'spotting'
                        if (isSpotting) {
                            // Spotting at end of cycle (pre-menstrual) should NOT start new cycle immediately?
                            // Usually spotting precedes period.
                            // So if we see spotting > 14 days later, it might be the start of next cycle's bleed.
                            // But typically Day 1 is Red Flow.
                            // CycleTrack convention: Let's assume start on spotting is OK if gap matches.
                            isNewCycle = true;
                        } else {
                            isNewCycle = true;
                        }
                    }
                }
            }
        }

        if (isNewCycle) {
            if (currentStart) {
                finishCycle(undefined, e.date);
            }
            currentStart = e.date;
            currentEntries = [];
            lastPeriodDateInCurrentCycle = null;
        }

        if (currentStart) {
            currentEntries.push(e);
            if (e.period) {
                lastPeriodDateInCurrentCycle = e.date;
            }
        }
    });

    if (currentStart) {
        finishCycle(undefined, undefined);
    }

    return cycles.reverse();
}
