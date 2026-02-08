'use client';
import { useCycleData } from '@/hooks/useCycleData';
import { useState } from 'react';
import { Trash2, Download, Upload } from 'lucide-react';

export default function SettingsPage() {
    const { data, importData, updateSettings } = useCycleData();
    const [importText, setImportText] = useState('');
    const [message, setMessage] = useState('');

    const handleExportJSON = () => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cycletrack-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        if (!importText) return;
        const count = importData(importText);
        setMessage(`${count} Einträge erfolgreich importiert.`);
        setImportText('');
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                <div className="text-4xl mb-2">⚙️</div>
                <h2 className="text-xl font-bold text-gray-800">Einstellungen</h2>
                <p className="text-gray-500 text-sm">Version 2.0 (Next.js)</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5 text-gray-500" />
                    Backup & Export
                </h3>
                <button
                    onClick={handleExportJSON}
                    className="w-full py-3 border-2 border-pink-500 text-pink-600 rounded-xl font-medium hover:bg-pink-50 transition-colors"
                >
                    Backup herunterladen (JSON)
                </button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-gray-500" />
                    Import
                </h3>
                <p className="text-sm text-gray-500 mb-3">Füge hier den Inhalt einer JSON-Backup-Datei ein.</p>
                <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl mb-3 text-xs font-mono"
                    rows={5}
                    placeholder='{"entries": {...}}'
                />
                <button
                    onClick={handleImport}
                    className="w-full py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                >
                    Importieren
                </button>
                {message && <div className="mt-3 text-green-600 text-sm font-medium bg-green-50 p-2 rounded-lg text-center">{message}</div>}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4">Zyklus-Einstellungen</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lutealphase (Tage)</label>
                        <input
                            type="number"
                            value={data.lutealPhase || 14}
                            onChange={(e) => updateSettings({ lutealPhase: parseInt(e.target.value) || 14 })}
                            className="w-full p-3 border border-gray-300 rounded-xl"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
