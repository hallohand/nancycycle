# NancyCycle 🌸

Eine private, kostenlose Zyklus-Tracking WebApp für Nancy.

## Features

✅ **Zyklustracking**
- Periode (Leicht/Mittel/Stark/Schmierblutung)
- Basaltemperatur (BBT) mit Diagramm
- Zervixschleim (Trocken/Klebrig/Cremig/Wässrig/Eiweißartig)
- LH-Tests (Positiv/Negativ)
- Geschlechtsverkehr (Geschützt/Ungeschützt)

✅ **Symptome & Stimmung**
- Krämpfe, Blähungen, Kopfschmerzen, Rückenschmerzen
- Brustspannen, Müdigkeit, Hautunreinheiten, Übelkeit
- Stimmung: Glücklich, Neutral, Traurig, Gereizt, Ängstlich, Energiegeladen

✅ **Fruchtbarkeitsberechnung**
- Automatische Berechnung fruchtbarer Tage
- Vorhersage nächster Periode
- Übersicht aktueller Zyklusphase

✅ **Temperaturkurve**
- Diagramm mit Coverline
- 30-Tage-Übersicht
- Visuelle Perioden-Markierung

✅ **Kalender-Ansicht**
- Monatliche Übersicht
- Farbkodierung (Periode, fruchtbar, Ovulation)
- Direkter Zugriff auf Tagesdetails

✅ **Datenschutz**
- Alle Daten bleiben auf dem Gerät (LocalStorage)
- Kein Server, keine Cloud, keine Registrierung
- Offline-fähig durch Service Worker

## Installation auf dem iPhone

### 1. GitHub Pages aktivieren

1. Erstelle ein neues Repository auf GitHub (z.B. `nancycycle`)
2. Lade alle Dateien aus diesem Ordner hoch
3. Gehe zu Settings → Pages
4. Wähle "Deploy from a branch" und wähle "main" / "root"
5. Warte 2-3 Minuten, dann ist die App unter `https://deinusername.github.io/nancycycle` erreichbar

### 2. Auf dem iPhone installieren

1. Öffne Safari und gehe zur GitHub Pages URL
2. Tippe auf das Teilen-Symbol (□ mit ↑)
3. Wähle "Zum Home-Bildschirm hinzufügen"
4. Die App erscheint wie eine native App mit Icon

### 3. Offline-Nutzung

Nach dem ersten Öffnen funktioniert die App auch ohne Internetverbindung!

## Daten-Backup

Da alle Daten im LocalStorage des Browsers gespeichert werden:

**Wichtig:** Daten gehen verloren bei:
- Löschen der App
- Browser-Daten löschen
- iOS-Update (manchmal)

**Backup-Tipp:** Exportiere regelmäßig die Daten über die Browser-Entwicklerkonsole:
```javascript
copy(JSON.stringify(localStorage.getItem('nancycycle_data')))
```

## Technische Details

- **Technologie:** HTML5, CSS3, Vanilla JavaScript
- **Diagramme:** Chart.js
- **Speicher:** LocalStorage (5-10 MB)
- **PWA:** Manifest + Service Worker

## Anpassungen

Um die App zu personalisieren, editiere in `app.js`:

```javascript
const currentData = {
    entries: {},
    cycleLength: 28,    // Durchschnittliche Zykluslänge
    periodLength: 5,    // Durchschnittliche Periodendauer
    lutealPhase: 14     // Lutealphase (nach Ovulation)
};
```

## Support

Bei Fragen oder Problemen einfach fragen!

---

Made with 💕 for Nancy