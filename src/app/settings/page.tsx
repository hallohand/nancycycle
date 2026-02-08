'use client';

import { useState, useRef } from 'react';
import { useCycleData } from '@/hooks/useCycleData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { parseFemometerCSV } from '@/lib/importer';
import { APP_VERSION, BUILD_DATE } from '@/lib/version';
import { RefreshCw, Trash2, RotateCcw } from 'lucide-react';

export default function SettingsPage() {
    const { data, updateSettings, importData, setAllEntries, clearAllData } = useCycleData();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (json.entries && json.cycleLength) {
                    importData(json);
                    toast.success('Daten erfolgreich importiert');
                } else {
                    toast.error('Ungültiges Dateiformat');
                }
            } catch (err) {
                toast.error('Fehler beim Lesen der Datei');
            }
        };
        reader.readAsText(file);
    };

    const handleFemometerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simple check for CSV extension
        if (!file.name.endsWith('.csv')) {
            toast.error('Bitte .csv Datei auswählen');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csvText = event.target?.result as string;
                const { entries, count } = parseFemometerCSV(csvText);

                if (count > 0) {
                    setAllEntries(entries);
                    toast.success(`${count} Einträge erfolgreich importiert!`);
                } else {
                    toast.warning('Keine Einträge gefunden oder Format nicht erkannt.');
                }
            } catch (err) {
                console.error(err);
                toast.error('Fehler beim Importieren der CSV.');
            }
        };
        reader.readAsText(file);
    };

    const exportData = () => {
        const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
            JSON.stringify(data)
        )}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `cycletrack-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const handleClearData = () => {
        if (confirm('Bist du sicher? Alle Daten werden unwiderruflich gelöscht.')) {
            clearAllData();
            toast.success('Alle Daten gelöscht.');
        }
    };

    // PWA Reset Logic
    const handleForceUpdate = async () => {
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
            // Clear caches
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }
            window.location.reload();
            toast.success('App wird neu geladen...');
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="space-y-6 pb-24 px-4 pt-6">
            <h2 className="text-2xl font-bold tracking-tight">Einstellungen</h2>

            <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>Zyklus-Einstellungen</CardTitle>
                    <CardDescription>Passe die App an deinen Körper an.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="cycleLength">Durchschnittliche Zykluslänge (Tage)</Label>
                        <Input
                            id="cycleLength"
                            type="number"
                            value={data.cycleLength}
                            onChange={(e) => updateSettings({ cycleLength: parseInt(e.target.value) || 28 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="periodLength">Periodendauer (Tage)</Label>
                        <Input
                            id="periodLength"
                            type="number"
                            value={data.periodLength}
                            onChange={(e) => updateSettings({ periodLength: parseInt(e.target.value) || 5 })}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white">
                <CardHeader>
                    <CardTitle>Datenverwaltung</CardTitle>
                    <CardDescription>Sicherung und Import.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" onClick={exportData} className="w-full">
                            Backup erstellen
                        </Button>
                        <div className="relative">
                            <Button variant="outline" className="w-full">
                                Backup wiederherstellen
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".json"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <Label className="mb-2 block">Femometer Import (.csv)</Label>
                        <div className="relative">
                            <Button variant="secondary" className="w-full">
                                CSV Datei auswählen
                            </Button>
                            <input
                                type="file"
                                onChange={handleFemometerUpload}
                                accept=".csv"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Exportiere deine Daten aus der Femometer App als CSV und lade sie hier hoch.
                        </p>
                    </div>

                    <div className="border-t pt-4">
                        <Button variant="destructive" onClick={handleClearData} className="w-full flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Alle Daten löschen
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-muted/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base">App Info & Updates</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                    <div className="flex justify-between items-center">
                        <span>Version:</span>
                        <span className="font-mono">{APP_VERSION} ({BUILD_DATE})</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleForceUpdate}
                        className="w-full gap-2 mt-2 bg-white hover:bg-gray-100 text-foreground border-gray-200"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Update erzwingen / Neu laden
                    </Button>
                    <p className="mt-1 opacity-70">
                        Drücke dies, wenn die App nicht aktuell scheint (Start/End-Daten falsch).
                    </p>
                </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground pt-4">
                CycleTrack v{APP_VERSION} • {BUILD_DATE}
            </div>
        </div>
    );
}
