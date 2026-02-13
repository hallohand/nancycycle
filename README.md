# CycleTrack 🍓🐰

**Version:** 0.8.0 (Beta)

CycleTrack ist ein privater, lokaler Zyklus-Tracker, der deine Daten ernst nimmt. Als Progressive Web App (PWA) läuft er direkt auf deinem Gerät und speichert alle sensiblen Gesundheitsdaten ausschließlich lokal (LocalStorage & IndexedDB). Es gibt keinen Cloud-Zwang und kein Tracking durch Dritte.

## Features

- **Datenschutz an erster Stelle:** Alle Daten bleiben auf deinem Gerät.
- **Offline-First:** Die App funktioniert vollständig ohne Internetverbindung.
- **Zyklus-Analyse:**
  - Automatische Vorhersage der nächsten Periode und fruchtbaren Tage.
  - Berücksichtigung von LH-Tests (Peak/Positiv) und Basaltemperatur (NFP-Ansatz).
  - Intelligente Erkennung von Zyklusanomalien (z.B. Kurzzyklen).
- **Umfangreiches Tracking:**
  - Periode (Stärke + Schmerzen)
  - Zervixschleim
  - LH-Tests
  - Basaltemperatur (mit Störfaktor-Ausblendung)
  - Symptome & Stimmung
  - Geschlechtsverkehr
- **Sicherheit:**
  - Lokale Verschlüsselung (in Planung)
  - **App Lock:** Optionaler Schutz durch PIN/Biometrie (FaceID/TouchID) beim App-Start.
- **Backup:**
  - Lokale Auto-Backups (Rotation).
  - Verschlüsselter Cloud-Sync via GitHub Gist (optional).
  - PDF-Export für Arztbesuche.

## Technologie-Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + Shadcn UI
- **State Management:** React Context + Hooks
- **Persistence:** LocalStorage + IndexedDB
- **PWA:** `next-pwa`

## Installation (Local Development)

1. Repository klonen:
   ```bash
   git clone https://github.com/hallohand/cycletrack.git
   cd cycletrack
   ```

2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```

3. Development Server starten:
   ```bash
   npm run dev
   ```

4. Öffne [http://localhost:3000](http://localhost:3000) im Browser.

## Security Audit (v0.8.0)

Ein Sicherheits-Audit wurde am 13.02.2026 durchgeführt.

- **Status:** Keine kritischen Vulnerabilities in Dependencies.
- **Datenhaltung:** Daten werden unverschlüsselt im LocalStorage des Browsers gespeichert.
  - *Empfehlung:* Schütze dein Gerät immer mit einer PIN oder Biometrie.
- **App Lock:** Der integrierte App-Lock ist eine UI-Sperre und bietet keinen kryptografischen Schutz der Datenbank. Er verhindert lediglich den schnellen Zugriff durch Dritte bei entsperrtem Gerät.

## Lizenz

Privat / MIT (siehe LICENSE).
