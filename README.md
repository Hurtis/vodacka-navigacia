# Vodácka navigácia

Malá webová aplikácia, ktorá pomáha s orientáciou na rieke a plánovaním splavu. Umožňuje nájsť miesta na vylodenie, prístaviská, bufety, kempy a ďalšie zaujímavé miesta. Po výbere štartu a cieľa zobrazí trasu na mape a odhad vzdialenosti po rieke. Ako štart možno použiť aj aktuálnu polohu.

Aktuálne ponúka Malý Dunaj a Mošonský Dunaj. Aplikácia používa HTML, CSS a JavaScript, mapu Leaflet s podkladmi OpenStreetMap a údaje vo formáte GeoJSON. Nepotrebuje backend ani zostavenie projektu.

## Spustenie

Potrebujete Python 3. V termináli spustite:

```sh
git clone https://github.com/Hurtis/vodacka-navigacia.git
cd vodacka-navigacia
python3 -m http.server 8000
```

Otvorte [http://localhost:8000](http://localhost:8000), vyberte rieku, štart a cieľ. Server zastavíte pomocou `Ctrl+C`.

Projekt spúšťajte cez HTTP server, pretože aplikácia načítava GeoJSON cez AJAX. Na mapové podklady a knižnice z CDN je potrebné internetové pripojenie. Pri použití aktuálnej polohy povoľte prehliadaču prístup k polohe; mimo localhostu vyžaduje táto funkcia HTTPS.

Údaje o riekach a miestach nájdete v `geojson/`, fotografie v `img/` a logiku aplikácie v `js/main.js`.
