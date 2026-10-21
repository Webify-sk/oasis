# Audit rezervačného systému — 6. 10. 2026

Rozsah: tréningy (bookings, kredity), kozmetika (klient aj personál), verejné kalendáre, cron, API trasy, štatistiky.
Metóda: 4 nezávislé kontroly kódu + vlastné overenie kľúčových nálezov v kóde, v SQL migráciách a na produkcii (len čítanie, žiadne zmeny v kóde ani v databáze).
Stav databázy: dáta sú v poriadku — 0 hodín nad kapacitou, 0 budúcich prekryvov v kozmetike, 0 rezervácií v dovolenkách, 2 duplicitné rezervácie tréningov (ten istý klient dvakrát na tej istej hodine).

Legenda závažnosti: 🔴 kritické (bezpečnosť / zneužiteľné hneď) · 🟠 vysoké (klientka to uvidí alebo stráca peniaze) · 🟡 stredné · ⚪ nízke
„Overené" = potvrdené mnou nad rámec kontroly kódu.

---

## 🔴 KRITICKÉ — riešiť ako prvé

| # | Nález | Kde | Overené |
|---|---|---|---|
| 1 | **Verejná trasa `/api/debug-profiles` prihlási kohokoľvek ako trénerku Viki.** Volá `signInWithPassword` s e-mailom a heslom zapísaným priamo v kóde (heslo je v gite). Návštevník dostane platnú session a vidí všetky rezervácie s menami, telefónmi a e-mailmi klientok. | `src/app/api/debug-profiles/route.ts:10` | ✅ kód + trasa na produkcii vracia 200 |
| 2 | **`/api/debug-reset?email=…` pošle e-mail na obnovu hesla na ľubovoľnú adresu**, bez prihlásenia, bez limitu. Dá sa zneužiť na spam z vášho SMTP a zisťovanie, kto má účet. | `src/app/api/debug-reset/route.ts:3-8` | ✅ kód |
| 3 | **Každý prihlásený klient si môže prepísať vlastné kredity.** Pravidlo RLS na `credit_batches` a `booking_deductions` sa volá „Enable all for admins and service roles", ale je `USING (true) WITH CHECK (true)` — platí pre všetkých. Kto si otvorí konzolu prehliadača, má neobmedzené tréningy zadarmo. | `migration_phase2.sql:17-19, 33-35` | ✅ SQL; žiadny neskorší súbor ho neruší — **treba potvrdiť v Supabase → Policies, že je to stále živé** |
| 4 | **Každý prihlásený klient môže upraviť ktorúkoľvek rezerváciu kozmetiky** (presunúť, zrušiť, zmeniť zamestnankyňu — aj cudziu). Pravidlo RLS „Authenticated users can update any appointment" + dve serverové akcie bez kontroly vlastníctva: `updateAppointmentStatus` (žiadna kontrola) a `rescheduleAppointment` (komentár v kóde to priznáva). | `fix_permissions.sql:43`, migrácia `:1063`; `cosmetic-actions.ts` ~1099, ~1182 | ✅ SQL + kód |
| 5 | **Ďalšie ladiace trasy bez prihlásenia so servisným kľúčom**: `/api/debug-bookings` (posledných 20 rezervácií s menami), `/api/debug-dashboard` (rezervácie 14 dní), `/api/debug-policies`, `/api/debug` (termíny kozmetičky), `/api/debug-tt`, `/api/debug-trainers`, `/api/debug-env`, `/api/debug/preview-voucher`. | `src/app/api/debug*/` | ✅ 8 trás na produkcii vracia 200 |

**Oprava bloku 1–5:** zmazať všetky `debug-*` trasy (žiadna nemá produkčné využitie), **zmeniť heslo trénerky Viki**, zrušiť dve chybné RLS pravidlá a nahradiť ich pravidlami s rolou/vlastníctvom, doplniť `requireEmployeeOrAdmin()` do `updateAppointmentStatus` a kontrolu vlastníctva do `rescheduleAppointment`. Odhad **4–6 h** kódu + zásah do databázy (SQL pravidlá — potrebujem váš súhlas alebo to spustíte vy).

---

## 🟠 VYSOKÉ — klientka to vidí alebo prichádza o peniaze

| # | Nález | Kde | Overené |
|---|---|---|---|
| 6 | **Verejný rozvrh tréningov nikdy nevidí rezervácie → každá skupinová hodina je „Voľné", aj keď je plná.** Stránka číta `bookings` anonymným klientom a RLS mu nedá ani jeden riadok. | `src/app/calendar/embed/page.tsx:13,46` | ✅ produkcia, október: 55 hodín, 55× „Voľné", 0× „Obsadené" |
| 7 | **Pripomienkové e-maily na tréningy nikdy neodišli.** Cron číta rezervácie anonymným klientom (RLS vráti nič) a aj keby, okno `+23 h až +25 h` od 08:00 UTC zachytí len hodiny medzi 7:00 a 9:00. Kozmetika pripomienky nemá vôbec. | `src/app/api/cron/reminders/route.ts:14,22-24` | ✅ DB: 0 z 1 964 prebehnutých rezervácií má `reminder_sent` |
| 8 | **Admin nedokáže zrušiť klientkinu rezerváciu tréningu** — akcia filtruje `user_id = prihlásený`, takže admin dostane „Rezervácia sa nenašla". Aj keby prešla, kredity by sa vrátili adminovi, nie klientke. Presun (reschedule) bol opravený, zrušenie nie. | `src/app/dashboard/trainings/actions.ts:276-285, 332-338`; volá `TrainingList.tsx:75`, `AdminBookingsManager.tsx:86` | ✅ kód |
| 9 | **Počet účastníkov sa na serveri nekontroluje.** Volanie akcie s `participantsCount = 0` → cena 0, žiadne kredity, rezervácia vznikne; záporné číslo zníži obsadenosť a umožní prebookovať hodinu. UI to blokuje, server nie. | `trainings/actions.ts:6,54,116,171`; stĺpec bez CHECK | ✅ kód |
| 10 | **Ktokoľvek prihlásený môže označiť hodinu ako individuálnu alebo vytvoriť/zmazať dovolenku trénera** (RLS „authenticated" na `training_session_exceptions` a `vacations`; `toggleSessionIndividual` bez kontroly roly). Globálna dovolenka = celý rozvrh „plný". | `admin/trainings/schedule-actions.ts:22-56`; migrácia `:1147-1175` | ✅ kód |
| 11 | **Admin formulár kozmetiky nekontroluje 15-min medzeru ani zdieľaný prístroj**; ručná rezervácia zamestnankyňou nekontroluje prístroj. Admin tak vie zadať Hydrafacial dvom klientkam naraz — presne ten problém z 15. 9. | `cosmetic-actions.ts` ~2146, ~2273, ~2004 | ✅ kód |
| 12 | **Zamestnankyňa môže zmazať dovolenku/výnimku inej zamestnankyne** (cez UI aj API — `removeAvailabilityException` bez kontroly, RLS „authenticated"). | `cosmetic-actions.ts:631-645`, `fix_exceptions_complete.sql:44` | ✅ kód |
| 13 | **Súbeh pri poslednom mieste / kreditoch**: kontrola a zápis sú oddelené, bez transakcie a bez obmedzenia v DB → dvaja klienti naraz obsadia posledné miesto; jeden klient dvoma kliknutiami zaplatí jeden kredit za dva tréningy. V kozmetike rovnako (kód ošetruje chybu `23P01`, ale žiadne také obmedzenie v DB neexistuje). | `trainings/actions.ts:42-56,165-209`; `cosmetic-actions.ts` ~875-923 | ✅ kód + SQL (žiadny EXCLUDE) |
| 14 | **RLS necháva zamestnankyňu zmazať ľubovoľnú rezerváciu a klienta zmazať zamestnancov** priamo cez API (serverové akcie to strážia, databáza nie). | `fix_appointments_rls.sql:5-14`, `fix_permissions.sql:22-23` | ✅ SQL |

Odhad bloku 6–14: **10–14 h** (bod 13 poriadne = presun rezervácie + odpočtu kreditov do jednej DB funkcie, ~4 h z toho).

---

## 🟡 STREDNÉ

| # | Nález | Kde |
|---|---|---|
| 15 | **12-hodinové pravidlo vrátenia kreditov je posunuté o 1–2 h** — porovnáva „face-value" čas hodiny s reálnym „teraz". Klient, ktorý zruší 10 h 05 min vopred, dostane kredity späť. Rovnako kontrola „hodina už prebehla". | `trainings/actions.ts:292-296, 465-469, 22-26` |
| 16 | **Presun rezervácie nikdy nevráti kredity za staršie rezervácie** (pred 27. 4.) ani za rezervácie vytvorené adminom — fallback je mŕtvy kód (`deductions` je `[]`, teda pravdivé). Klient zaplatí nový termín celý. | `trainings/actions.ts:551-564` |
| 17 | Vrátenie kreditov pri zrušení môže **vyrobiť kredity, ktoré klient nezaplatil** (napr. po vypršaní neobmedzenky), alebo ich vrátiť do už expirovanej dávky, kde sa nedajú minúť. | `trainings/actions.ts:321-349` |
| 18 | **Presun rezervácie nie je atomický** — stará sa zmaže, nová môže zlyhať → klient bez rezervácie. Presun na tú istú hodinu, ak je plná, zlyhá (počíta aj seba). | `trainings/actions.ts:572-624` |
| 19 | Server **nebráni rezervácii tréningu do dovolenky ani do individuálnej hodiny** — bráni len vypnuté tlačidlo. | `trainings/actions.ts:6-267` |
| 20 | **HTML z poznámky a mena klientky ide neošetrené do e-mailu zamestnankyni** (phishing-ready); dĺžka poznámky nie je na serveri obmedzená. | `cosmetic-actions.ts` ~1005-1015, ~1149, ~1928 |
| 21 | Presmerovanie po prihlásení sa dá obísť spätným lomítkom (`/?redirect=/\evil.com`). Treba overiť v prehliadači. | `src/app/auth/actions.ts:39-42,130-133` |
| 22 | Admin formulár prijme **koniec pred začiatkom** (23:30 + 90 min = 01:00 v ten istý deň), server to nevaliduje → záporné trvanie, kontrola kolízií sa obíde. Server dôveruje `end_time` aj od klienta (`createAppointment`) — treba ho počítať z trvania služby. | `AdminReservationFormModal.tsx:73-77`, `cosmetic-actions.ts` ~824 |
| 23 | **Uloženie pracovného času = zmaž všetko, potom vlož** — pri chybe zostane zamestnankyňa bez hodín a zmizne z rezervácií. | `cosmetic-actions.ts:700-732` |
| 24 | **Zmazanie zamestnankyne osirotí jej rezervácie** — zostanú potvrdené, blokujú miestnosť, nikto ich nevidí, klientky nedostanú správu. | `cosmetic-actions.ts:1348-1365`, FK `on delete set null` |
| 25 | **Zrušenie rezervácie zamestnankyňou neinformuje klientku** — e-mail ide len zamestnankyni, ktorá klikla. | `cosmetic-actions.ts:1112-1170` |
| 26 | Míľniky počítajú aj **budúce** rezervácie (10 rezervácií dopredu = okamžitý postup). | `dashboard/milestones/page.tsx:12-15` |
| 27 | Štatistiky: nefiltrujú `status`; zoskupujú podľa surového reťazca času (sekundy = nová „hodina"); dátumový filter mieša UTC a lokálny čas; personál vylúčený natvrdo podľa dvoch e-mailov; cena procedúry sa berie z aktuálneho cenníka, nie z rezervácie. | `statistics-actions.ts:53,155,160-164,216`; `StatisticsDashboard.tsx:64-75` |
| 28 | **Strop 1 000 riadkov** (rovnaká chyba ako v štatistikách) čaká na: admin prehľad rezervácií, admin tréningy, týždenný kalendár kozmetiky (`getAppointments` — vzostupne, takže zmiznú najnovšie), `getEmployeeAppointments`, `getAvailableDaysInMonth`. | `admin/bookings/page.tsx:11-30`, `admin/trainings/page.tsx:26-37`, `cosmetic-actions.ts` ~1055-1097, ~1414 |
| 29 | Cron na upozornenia o expirácii kreditov **funguje len vďaka chybnému pravidlu z bodu 3** — po jeho oprave sa potichu zastaví. | `cron/expiration-warnings/route.ts:14` |
| 30 | Zrušenie termínu kozmetiky nemá žiadnu uzávierku (klientka môže zrušiť minútu pred termínom, miesto prepadne). **Obchodné rozhodnutie.** | `cosmetic-actions.ts` ~1824 |

Odhad bloku 15–30: **12–16 h**.

---

## ⚪ NÍZKE

- Duplicitná rezervácia toho istého klienta na tú istú hodinu nie je zakázaná v DB (2 prípady už existujú).
- Sprievodca kozmetiky počíta „dnes" v UTC (medzi 00:00 a 02:00 predvyberie včerajšok).
- Kalendáre personálu neukazujú mená hostí (`client_name`), len „Hosť".
- Párovanie hosťa na účet podľa e-mailu rozlišuje veľkosť písmen a padne pri duplicitnom e-maile.
- Vytvorenie zamestnankyne bez rollbacku (auth účet zostane, druhý pokus zlyhá).
- `/api/debug/preview-voucher` generuje PDF bez prihlásenia (lacný DoS); hromadné stiahnutie faktúr bez limitu.
- Verejný rozvrh: dni z predchádzajúceho mesiaca v mriežke sú prázdne, z nasledujúceho plné.
- Formulár dovolenky trénera parsuje dátum v čase servera (funguje len preto, že Vercel beží v UTC).
- `npm audit`: 2 kritické (jspdf, next), 6 vysokých (nodemailer, sharp, postcss, ws, …).

---

## Čo je v poriadku (overené)

- Výpočet voľných termínov kozmetiky je konzistentný na všetkých miestach: 15-min medzera, zdieľaný prístroj, dve miestnosti, dovolenky, uzávierka — generátor aj finálna kontrola používajú rovnakú logiku.
- Časové pásma: generovanie hodín tréningov je konzistentné naprieč všetkými pohľadmi; uzávierka rezervácií počíta správne aj cez zmenu času.
- Klient nemôže zrušiť ani vidieť cudziu rezerváciu tréningu; expirované kredity sa nepoužívajú; FIFO poradie dávok.
- Verejné kalendáre nevracajú žiadne osobné údaje; cron trasy majú tajomstvo v hlavičke; `.env` nie je v gite; admin stránky majú strážcu.
- E-maily po zápise do DB sú v `try/catch` — zlyhanie pošty nezruší rezerváciu.

---

## Navrhované poradie prác

| Balík | Obsah | Odhad |
|---|---|---|
| A — núdzová bezpečnosť | body 1–5: zmazať debug trasy, zmena hesla trénerky, oprava 2 RLS pravidiel, kontroly vlastníctva | 4–6 h + SQL |
| B — viditeľné chyby | body 6–12, 24, 25, 26: verejný rozvrh, pripomienky, admin zrušenie, validácia účastníkov, prístroj v admine, mazanie zamestnankýň, e-mail klientke | 8–10 h |
| C — kredity a súbeh | body 13, 15–19: refundy, atomický presun, DB obmedzenia, blokovanie dovoleniek na serveri | 8–12 h |
| D — hygiena | body 20–23, 27–29, nízke, aktualizácia závislostí | 6–8 h |

Spolu zhruba **26–36 h**. Balík A odporúčam urobiť okamžite a nezávisle od ostatných.

---

## Stav opráv — 21. 10. 2026 (lokálne commity, nepushnuté)

| Balík | Commit | Kód | Databáza |
|---|---|---|---|
| A — bezpečnosť (body 1–5, 10, 12, 14, 29) | `bf2edba` | hotové | **čaká:** `sql/2026-10-21-security-A-up.sql` (rollback `-down.sql`) — spustiť v Supabase **spolu s nasadením** |
| B — viditeľné chyby (6–9, 11, 22, 24–26) | `d5653cc` | hotové | — |
| C — kredity a súbeh (13, 15–19) | `aefb371` | hotové | **čaká:** `sql/2026-10-21-integrity-C-up.sql` (rollback `-down.sql`) — spustiť **spolu s nasadením** (kód volá `adjust_credit_batch`) |
| D — hygiena (20, 21, 23, 27, 28, nízke) | `58ff5c2` | hotové | — |

Neriešené zámerne: nodemailer 10 (major verzia, samostatná zmena); bod 30 (uzávierka zrušenia kozmetiky — obchodné rozhodnutie); bod 17 čiastočne (refund presne zaplatenej sumy by vyžadoval nový stĺpec); createEmployee bez rollbacku; pripomienky pre kozmetiku (nová funkcia).
Na strane klienta: zmena hesla trénerky Viki.
