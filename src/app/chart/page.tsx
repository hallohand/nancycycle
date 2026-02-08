'use client';
import { useCycleData } from '@/hooks/useCycleData';
import { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function ChartPage() {
    const { data, isLoaded } = useCycleData();
    const [chartData, setChartData] = useState<ChartData<'line'>>({ datasets: [] });

    useEffect(() => {
        if (!isLoaded) return;

        const entries = Object.values(data.entries).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Logic: Find last cycle start to show current cycle
        const periodEntries = entries.filter(e => e.period);
        const lastPeriod = periodEntries[periodEntries.length - 1];

        if (!lastPeriod) {
            setChartData({ labels: [], datasets: [] });
            return;
        }

        // Show from last period onwards
        const startDate = new Date(lastPeriod.date);
        const relevantEntries = entries.filter(e => new Date(e.date) >= startDate);

        // Map to days 1..N
        const labels = relevantEntries.map(e => {
            const dayDiff = Math.floor((new Date(e.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            return `ZT ${dayDiff}`;
        });

        const temps = relevantEntries.map(e => e.temperature || null);

        setChartData({
            labels,
            datasets: [
                {
                    label: 'Temperatur',
                    data: temps,
                    borderColor: 'rgb(236, 72, 153)',
                    backgroundColor: 'rgba(236, 72, 153, 0.5)',
                    tension: 0.1,
                    spanGaps: true
                }
            ]
        });

    }, [data, isLoaded]);

    if (!isLoaded) return <div>Laden...</div>;

    return (
        <div className="space-y-6 h-[500px]">
            <div className="bg-white p-4 rounded-2xl shadow-sm h-full flex flex-col">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Temperaturkurve</h2>
                <div className="flex-1 relative">
                    <Line
                        data={chartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    min: 35.5,
                                    max: 37.5,
                                }
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
