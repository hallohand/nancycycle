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

    // Helper to finish a cycle
    const finishCycle = (end: string | undefined, nextStart: string | undefined) => {
        if (!currentStart) return;

        // Filter entries that actually belong to this cycle (based on date)
        // Although the loop logic already groups them.

        // Determine Length
        let length = 0;
        let endDate = end;

        if (nextStart) {
            length = Math.round((new Date(nextStart).getTime() - new Date(currentStart).getTime()) / (1000 * 60 * 60 * 24));
            const d = new Date(nextStart);
            d.setDate(d.getDate() - 1);
            endDate = d.toISOString().split('T')[0];
        } else {
            // Up to today or max of entries
            const lastEntryDate = currentEntries[currentEntries.length - 1]?.date || currentStart;
            const today = new Date().toISOString().split('T')[0];
            // If cycle started long ago (e.g. > 40 days) and no new period, maybe assume it ended at today?
            // Or just count days until today.
            length = Math.round((new Date(today).getTime() - new Date(currentStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }

        // Calculate Period Length (days with flow) within the first 10 days of cycle?
        // Or just count total period days in this group.
        const periodLength = currentEntries.filter(e => e.period).length;

        // Generate Days Array for Visualization
        // We need an entry for EVERY day from start to end (or length).
        const visDays = [];
        for (let i = 0; i < length; i++) {
            const date = new Date(currentStart);
            date.setDate(date.getDate() + i);
            const iso = date.toISOString().split('T')[0];

            // Find entry if exists
            const entry = entriesMap[iso];

            // Determine status
            // Period: if entry has period or if it's within predicted period? Use recorded only.
            const isPeriod = !!entry?.period;

            // Fertile/Ovulation: Harder strictly from history without stats?
            // Use recorded signs (LH, Sex, Mucus) OR fallback to standard calculation relative to cycle end/start?
            // The screenshot shows colored dots. Femometer calculates it retrospectively.
            // Let's use simple logic: Ovulation = CycleLength - 14. Fertile = Ovu-5..Ovu.
            // If Cycle Length is crazy (e.g. 60), this might look weird, but it's what "Calculated" means.

            // Exception: If we have CONFIRMED Ovulation in entry (e.g. from engine analysis), use that.
            // But here we are separating logic. Let's stick to simple "Standard Model" for history visualization unless data says otherwise.

            let isOvulation = false;
            let isFertile = false;

            // Prediction Logic for history
            const ovuDayIndex = length - 14;
            if (i === ovuDayIndex - 1) isOvulation = true; // 0-indexed day, but length-14 is e.g. 28-14=14 (15th day). 
            // Wait: 28 day cycle. Ovu on day 14 (Index 13).
            // i=13. 14 = 28-14. Correct.

            if (i >= ovuDayIndex - 5 && i <= ovuDayIndex) isFertile = true;

            // Override with actual data signs
            if (entry?.lhTest === 'peak') isOvulation = true; // LH peak is close to Ovu
            // Actually Peak is day BEFORE Ovu usually.

            visDays.push({
                date: iso,
                isPeriod,
                isFertile: isFertile && !isPeriod, // Period overrides fertile color usually
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
        const prev = i > 0 ? entries[i - 1] : null;
        // Detect Period Start
        // Heuristic: Has Period AND (No prev period OR gap > 10 days)
        const isPeriodStart = e.period && (!prev?.period || (new Date(e.date).getTime() - new Date(prev.date).getTime() > 1000 * 60 * 60 * 24 * 10));

        if (isPeriodStart) {
            if (currentStart) {
                finishCycle(prev?.date, e.date);
            }
            currentStart = e.date;
            currentEntries = [];
        }

        if (currentStart) {
            currentEntries.push(e);
        }
    });

    // Finish last cycle
    if (currentStart) {
        finishCycle(undefined, undefined);
    }

    return cycles.reverse();
}
