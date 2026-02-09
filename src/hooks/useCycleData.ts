import { useState, useEffect, useRef } from 'react';
import { CycleData, DEFAULT_CYCLE_DATA, CycleEntry } from '@/lib/types';
import { rotateLocalBackup, saveIndexedDBSnapshot, debouncedCloudSync } from '@/lib/backup';

const STORAGE_KEY = 'cycletrack_data';
const LAST_SNAPSHOT_KEY = 'cycletrack_last_snapshot';

export function useCycleData() {
    const [data, setData] = useState<CycleData>(DEFAULT_CYCLE_DATA);
    const [isLoaded, setIsLoaded] = useState(false);
    const saveCount = useRef(0);

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
        const json = JSON.stringify(newData);
        setData(newData);
        localStorage.setItem(STORAGE_KEY, json);

        // Backup rotation on every save
        rotateLocalBackup(json);

        // Debounced cloud sync
        debouncedCloudSync(newData);

        // IndexedDB snapshot once daily
        saveCount.current++;
        const lastSnapshot = localStorage.getItem(LAST_SNAPSHOT_KEY);
        const today = new Date().toISOString().split('T')[0];
        if (lastSnapshot !== today) {
            saveIndexedDBSnapshot(newData);
            localStorage.setItem(LAST_SNAPSHOT_KEY, today);
        }
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

    const clearAllData = () => {
        const resetData = { ...DEFAULT_CYCLE_DATA, entries: {} };
        saveData(resetData);
    };

    return {
        data,
        isLoaded,
        updateEntry,
        setAllEntries,
        deleteEntry,
        updateSettings,
        importData,
        clearAllData
    };
}
