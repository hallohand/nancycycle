'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, BarChart2, Settings } from 'lucide-react';
import { ReactNode } from 'react';

const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={`flex flex-col items-center justify-center flex-1 py-2 text-xs font-medium transition-colors ${isActive ? 'text-pink-600' : 'text-gray-500 hover:text-pink-400'
                }`}
        >
            <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span>{label}</span>
        </Link>
    );
};

import PageTransition from './PageTransition';

export default function Layout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isHome = pathname === '/';

    return (
        <div className="min-h-screen bg-gray-50 pb-[80px]">
            {/* Header */}
            <header className="bg-gradient-to-br from-pink-500 to-pink-700 text-white p-5 shadow-sm sticky top-0 z-50">
                <h1 className="text-xl font-bold tracking-tight">CycleTrack</h1>
                <div className="text-sm opacity-90 mt-1">
                    {new Date().toLocaleDateString('de-DE', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </header>

            {/* Main Content */}
            <main className="container max-w-lg mx-auto p-4">
                <PageTransition>{children}</PageTransition>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around pb-safe pt-2 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <NavItem href="/" icon={Home} label="Übersicht" />
                <NavItem href="/entry" icon={PlusCircle} label="Eintrag" />
                <NavItem href="/chart" icon={BarChart2} label="Kurve" />
                <NavItem href="/settings" icon={Settings} label="Einstellungen" />
            </nav>
        </div>
    );
}
