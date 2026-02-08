import { CycleEntry } from '@/lib/types';

export interface CycleGroup {
    id: string;
    startDate: string;
    endDate?: string;
    length?: number;
    periodLength: number;
    entries: CycleEntry[];
    // Computed day statuses for the visualization bar
    days: {
        date: string;
        isPeriod: boolean;
        isFertile: boolean;
        isOvulation: boolean;
        hasSex: boolean;
    }[];
}


export function groupCycles(entriesMap: Record<string, CycleEntry>): CycleGroup[] {
    const entries = Object.values(entriesMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const cycles: CycleGroup[] = [];

    let currentEntries: CycleEntry[] = [];
    let currentStart = '';
    let lastPeriodDateInCurrentCycle: string | null = null;

    // Helper to finish a cycle
    const finishCycle = (end: string | undefined, nextStart: string | undefined) => {
        if (!currentStart) return;

        let length = 0;
        let endDate = end;

        if (nextStart) {
            length = Math.round((new Date(nextStart).getTime() - new Date(currentStart).getTime()) / (1000 * 60 * 60 * 24));
            const d = new Date(nextStart);
            d.setDate(d.getDate() - 1);
            endDate = d.toISOString().split('T')[0];
        } else {
            const today = new Date().toISOString().split('T')[0];
            // Ensure length is at least the span of entries if future
            length = Math.round((new Date(today).getTime() - new Date(currentStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Sanity check: if the last entry was months ago, clamp length? 
            // For now, let it be "up to today" as it is the "Current Cycle".
        }

        const periodLength = currentEntries.filter(e => e.period).length;

        // Generate Days Array for Visualization
        const visDays = [];
        for (let i = 0; i < length; i++) {
            const date = new Date(currentStart);
            date.setDate(date.getDate() + i);
            const iso = date.toISOString().split('T')[0];

            const entry = entriesMap[iso];

            const isPeriod = !!entry?.period;

            let isOvulation = false;
            let isFertile = false;

            // Standard Model Retrospective
            const ovuDayIndex = length - 14;
            if (length > 20) { // Only calculate for reasonable cycles
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
        // Decide if this entry STARTS a new cycle
        // It must be a Period entry.
        // AND it must be "far enough" from the previous period block of the CURRENT cycle.

        let isNewCycle = false;

        if (e.period) {
            if (!currentStart) {
                isNewCycle = true;
            } else {
                // We have a current cycle running.
                // Check distance from currentStart
                const diffFromStart = (new Date(e.date).getTime() - new Date(currentStart).getTime()) / (1000 * 60 * 60 * 24);

                // If we are very close to start (e.g. within 7 days), it's part of the first period.
                if (diffFromStart < 14) {
                    isNewCycle = false;
                } else {
                    // It is > 14 days from start.
                    // Check distance from LAST recorded period entry to handle spotty logs?
                    // If I had a period on day 20 (spotting), and now day 28 (real period).
                    // If diff is > 10 days from last spotting?

                    const diffFromLastPeriod = lastPeriodDateInCurrentCycle
                        ? (new Date(e.date).getTime() - new Date(lastPeriodDateInCurrentCycle).getTime()) / (1000 * 60 * 60 * 24)
                        : diffFromStart;

                    if (diffFromLastPeriod > 10) {
                        isNewCycle = true;
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
                // Update last period date, BUT only if it makes sense?
                // If we iterate chronologically, yes.
                lastPeriodDateInCurrentCycle = e.date;
            }
        }
    });

    if (currentStart) {
        finishCycle(undefined, undefined);
    }

    return cycles.reverse();
}
