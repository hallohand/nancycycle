import { useState, useEffect } from 'react';
import { CycleData, DEFAULT_CYCLE_DATA, CycleEntry } from '@/lib/types';

const STORAGE_KEY = 'cycletrack_data';

export function useCycleData() {
    const [data, setData] = useState<CycleData>(DEFAULT_CYCLE_DATA);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure defaults for missing fields
                setData({
                    ...DEFAULT_CYCLE_DATA,
                    ...parsed,
                    entries: parsed.entries || {},
                });
            } catch (e) {
                console.error('Failed to parse cycle data', e);
            }
        }
        setIsLoaded(true);
    }, []);

    const saveData = (newData: CycleData) => {
        setData(newData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    };

    const setAllEntries = (newEntries: Record<string, CycleEntry>) => {
        const updatedData = { ...data, entries: { ...data.entries, ...newEntries } };
        setData(updatedData);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
        } catch (e) {
            console.error("Save failed", e);
        }
    }

    const updateEntry = (date: string, entry: Partial<CycleEntry>) => {
        const newEntries = { ...data.entries };
        const existing = newEntries[date] || { date };
        newEntries[date] = { ...existing, ...entry };

        // Clean up empty entries if needed, but keeping them is fine for now

        saveData({ ...data, entries: newEntries });
    };

    const deleteEntry = (date: string) => {
        const newEntries = { ...data.entries };
        delete newEntries[date];
        saveData({ ...data, entries: newEntries });
    };

    const updateSettings = (settings: Partial<Omit<CycleData, 'entries'>>) => {
        saveData({ ...data, ...settings });
    };

    const importData = (jsonData: string): number => {
        try {
            const parsed = JSON.parse(jsonData);
            // Simple validation
            if (!parsed.entries) throw new Error("Invalid format");

            // Merge or replace? Let's merge for safety, or replace if it's a full restore.
            // The original app seemed to replace or merge blindly.
            // Let's go with merge.
            const mergedData = {
                ...data,
                ...parsed,
                entries: { ...data.entries, ...parsed.entries }
            };
            saveData(mergedData);
            return Object.keys(parsed.entries).length;
        } catch (e) {
            console.error(e);
            return 0;
        }
    };

    return {
        data,
        isLoaded,
        updateEntry,
        setAllEntries,
        deleteEntry,
        updateSettings,
        importData
    };
}
