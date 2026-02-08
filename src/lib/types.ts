export type PeriodFlow = 'light' | 'medium' | 'heavy' | 'spotting';
export type CervixType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
export type LHTestResult = 'negative' | 'positive' | 'peak'; // Added 'peak'
export type SexType = 'protected' | 'unprotected' | 'none'; // Added explicitly
export type MoodType = 'happy' | 'sad' | 'anxious' | 'irritated' | 'energetic' | 'tired';

export interface CycleEntry {
    date: string; // YYYY-MM-DD
    temperature?: number | null;
    excludeTemp?: boolean; // New: Exclude from calculation (e.g. fever)
    period?: PeriodFlow | null;
    cervix?: CervixType | null;
    lhTest?: LHTestResult | null;
    sex?: SexType | null; // New: Sexual activity
    symptoms?: string[];
    mood?: MoodType[];
    notes?: string;
    // Legacy support
    isOvulation?: boolean; // Manual override
}

export interface CycleData {
    entries: Record<string, CycleEntry>;
    cycleLength: number; // User average or setting
    periodLength: number; // User average or setting
    lutealPhase: number; // User setting, default 14
}

export const DEFAULT_CYCLE_DATA: CycleData = {
    entries: {},
    cycleLength: 28,
    periodLength: 5,
    lutealPhase: 14,
};
