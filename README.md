# Vodácka navigácia

Malá webová aplikácia, ktorá pomáha s orientáciou na rieke a plánovaním splavu. Umožňuje nájsť miesta na vylodenie, prístaviská, bufety, kempy a ďalšie zaujímavé miesta. Po výbere štartu a cieľa zobrazí trasu na mape a odhad vzdialenosti po rieke. Ako štart možno použiť aj aktuálnu polohu.

Aktuálne ponúka Malý Dunaj, Mošonský Dunaj a Dunaj (Bratislava). Aplikácia používa HTML, CSS a JavaScript, mapu Leaflet s podkladmi OpenStreetMap a údaje vo formáte GeoJSON. Nepotrebuje backend ani zostavenie projektu.

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

## Rozhranie a mapové podklady

Na počítači je plánovač v bočnom paneli a mapa vypĺňa zvyšok okna pod bielou hornou lištou. Na mobile sa panel zobrazí nad mapou. Font zostáva pôvodný systémový font Bootstrapu. Jediný mapový podklad je OpenStreetMap.

Dáta sa naďalej načítavajú priamo z `geojson/<rieka>/river.geojson` a `points.geojson`, bez databázy a bez buildu.

## Automatické nasadzovanie

Workflow `.github/workflows/deploy.yml` sa spustí po pushi na `main` alebo ručne cez Actions → Deploy Vodacka navigacia → Run workflow. Overí syntax JavaScriptu a platnosť GeoJSON súborov a cez SSH/rsync nahrá verejné súbory na Websupport. HTML sa nahráva ako posledné. Existujúce súbory na hostingu sa automaticky nemažú.

V repozitári GitHub nastavte v Settings → Secrets and variables → Actions tieto secrets (rovnaké názvy ako v Swimmable; secrets sa medzi repozitármi neprenášajú automaticky):

- `WEBSUPPORT_SSH_PRIVATE_KEY`: súkromný nasadzovací SSH kľúč.
- `WEBSUPPORT_SSH_KNOWN_HOSTS`: overený záznam SSH hostiteľa vrátane portu 26800.

Workflow používa hostiteľa `shell.r5.websupport.sk`, účet `uid1083961` a webroot `/data/d/c/dcd5ea33-2c96-443d-9288-ab7942f77b67/hurtis.sk/sub/rieky`. Pred prvým spustením overte, že tento adresár je webroot aplikácie a SSH účet má právo doň zapisovať. Adresu sme odvodili z konfigurácie Swimmable; produkčný server ešte nebol overený. Pri zmene webrootu upravte aj ochrannú kontrolu cesty v `scripts/deploy-websupport.sh`.

Po nastavení secrets a pushi sa aj zmeny GeoJSON súborov a fotografií nasadia automaticky. Nie je potrebné ručné SFTP ani databáza. Workflow na konci kontroluje HTTP odpoveď `https://rieky.hurtis.sk/`.
