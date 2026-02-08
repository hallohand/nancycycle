export type PeriodFlow = 'light' | 'medium' | 'heavy' | 'spotting';
export type CervixType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
export type LHTestResult = 'positive' | 'negative';
export type SexType = 'protected' | 'unprotected';
export type MoodType = 'happy' | 'neutral' | 'sad' | 'irritable' | 'anxious' | 'energetic';

export interface CycleEntry {
    date: string; // YYYY-MM-DD
    temperature?: number | null;
    period?: PeriodFlow | null;
    cervix?: CervixType | null;
    lhTest?: LHTestResult | null;
    sex?: SexType | null;
    mood?: MoodType | null;
    symptoms?: string[];
    notes?: string | null;
}

export interface CycleData {
    entries: Record<string, CycleEntry>;
    cycleLength: number;
    periodLength: number;
    lutealPhase: number;
}

export const DEFAULT_CYCLE_DATA: CycleData = {
    entries: {},
    cycleLength: 28,
    periodLength: 5,
    lutealPhase: 14,
};
