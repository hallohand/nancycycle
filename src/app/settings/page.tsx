'use client';
import { useCycleData } from '@/hooks/useCycleData';
import { useState, useRef } from 'react';
import { Trash2, Download, Upload, Save, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { parseFemometerCSV } from '@/lib/importer';

export default function SettingsPage() {
    const { data, importData, updateSettings, setAllEntries } = useCycleData();
    const [importText, setImportText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExportJSON = () => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cycletrack-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Backup heruntergeladen");
    };

    const handleImportJSON = () => {
        if (!importText) return;
        try {
            const count = importData(importText);
            toast.success(`${count} Einträge erfolgreich importiert.`);
            setImportText('');
        } catch (e) {
            toast.error("Fehler beim Importieren. Überprüfe das Format.");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (text) {
                try {
                    const entries = parseFemometerCSV(text);
                    const count = Object.keys(entries).length;
                    if (count === 0) {
                        toast.error("Keine gültigen Einträge gefunden.");
                        return;
                    }
                    setAllEntries(entries);
                    toast.success(`${count} Femometer-Einträge importiert! 🎉`);
                } catch (err) {
                    console.error(err);
                    toast.error("Fehler beim Lesen der CSV-Datei.");
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="text-center py-4">
                <h2 className="text-2xl font-bold tracking-tight">Einstellungen</h2>
                <p className="text-muted-foreground text-sm">Verwalte deine Daten & Präferenzen</p>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Zyklus-Parameter</CardTitle>
                    <CardDescription>Passe die Berechnungen an deinen Körper an.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Lutealphase (Tage)</Label>
                        <Input
                            type="number"
                            value={data.lutealPhase || 14}
                            onChange={(e) => updateSettings({ lutealPhase: parseInt(e.target.value) || 14 })}
                        />
                        <p className="text-xs text-muted-foreground">Standard ist 14 Tage. Ändere dies nur, wenn du deine genaue Lutealphase kennst.</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="Daten-Import & Export">Daten-Verwaltung</CardTitle>
                    <CardDescription>Deine Daten gehören dir. Exportiere oder importiere sie jederzeit.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="font-semibold">Sicherung (JSON)</Label>
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExportJSON}>
                            <Download className="w-4 h-4" /> Backup speichern
                        </Button>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                        <div className="space-y-2">
                            <Label className="font-semibold">Femometer Import (CSV)</Label>
                            <div className="flex gap-2">
                                <Button className="w-full gap-2 bg-rose-100 text-rose-700 hover:bg-rose-200" onClick={() => fileInputRef.current?.click()}>
                                    <FileSpreadsheet className="w-4 h-4" /> CSV-Datei wählen
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">Original .csv Datei aus der Femometer App.</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t space-y-2">
                        <Label className="font-semibold">Wiederherstellen (JSON)</Label>
                        <Textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            className="mb-2 font-mono text-xs"
                            placeholder='JSON Inhalt hier einfügen...'
                            rows={3}
                        />
                        <Button className="w-full gap-2" variant="outline" onClick={handleImportJSON} disabled={!importText}>
                            <Upload className="w-4 h-4" /> JSON Importieren
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground pt-8">
                CycleTrack v3.0 • Privacy First
            </div>
        </div>
    );
}
