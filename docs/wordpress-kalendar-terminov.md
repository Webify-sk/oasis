# Kalendár voľných termínov na web (WordPress)

Každá procedúra má vlastný kalendár. Na stránku procedúry vložte jej vlastný kód nižšie.

## 1. Jednorazovo: skript pre automatickú výšku

Vložte **raz** do pätičky webu (Vzhľad → Editor motívu → footer, alebo cez plugin na vlastný kód).
Bez neho bude kalendár fungovať, ale na mobile sa v ňom objaví vlastný posuvník.

```html
<script>
window.addEventListener('message', function (e) {
  if (e.origin !== 'https://profil.oasislounge.sk') return;
  if (!e.data || e.data.type !== 'oasis-embed-height') return;
  document.querySelectorAll('iframe.oasis-terminy').forEach(function (f) {
    if (f.contentWindow === e.source) f.style.height = e.data.height + 'px';
  });
});
</script>
```

## 2. Na každú stránku procedúry jej vlastný kód

Kód sa dá kedykoľvek skopírovať aj priamo v administrácii: **Kozmetika → Služby → daná služba → „Kód pre web"**.

### Endosphère Therapy - Celé telo (60 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=fc1962db-13dd-4f3a-9bec-4afbf1eb1443"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Endosphère Therapy - Celé telo"></iframe>
```

### Endosphère Therapy - Chrbát, ruky (25 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=e2678ce1-9453-4e51-9a9b-b7df1449afa7"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Endosphère Therapy - Chrbát, ruky"></iframe>
```

### Endosphère Therapy - Zadok, brucho, stehná (45 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=0c450071-34dc-4cea-b172-edaefb0493e2"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Endosphère Therapy - Zadok, brucho, stehná"></iframe>
```

### Hydrafacial Classic (50 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=857f4d81-11d1-4a3e-b329-3040b8c17cae"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Hydrafacial Classic"></iframe>
```

### Hydrafacial Platinum (vákuová masáž +booster+LED) (60 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=46aeed62-7d15-4cca-88c3-e563eca46e1b"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Hydrafacial Platinum (vákuová masáž +booster+LED)"></iframe>
```

### Kobido masáž - 30 min (30 min) ⚠️ **nemá priradenú žiadnu zamestnankyňu — kalendár bude prázdny**

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=6c1aa8f1-af7f-499e-93ff-2bf630a2fc7a"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Kobido masáž - 30 min"></iframe>
```

### Kobido masáž - 60 min (60 min) ⚠️ **nemá priradenú žiadnu zamestnankyňu — kalendár bude prázdny**

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=9bfccc71-f3a6-4b4d-b008-f75829aade86"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Kobido masáž - 60 min"></iframe>
```

### Kozmetika  Doctor Babor Teenage Facial (Clean & Hydrate) (60 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=e033dc68-44c1-446b-9b85-a4cd658a3cd0"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Kozmetika  Doctor Babor Teenage Facial (Clean & Hydrate)"></iframe>
```

### Ošetrenia Babor - 60 min (60 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=409cb908-9dc2-4ec8-8844-7ad8f19bfdb1"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Ošetrenia Babor - 60 min"></iframe>
```

### Ošetrenia Babor - 90 min (90 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=d8694135-4429-4ae3-bf5f-7e415d9c6f1c"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Ošetrenia Babor - 90 min"></iframe>
```

### Venus Legacy - podbradok, krk (40 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=07b2e8f5-9ccb-4741-a62b-cac832d8649d"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Venus Legacy - podbradok, krk"></iframe>
```

### Venus Legacy - Ruky, paže (40 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=3b5b4ed3-1a2d-4be2-970f-f7356bae51c0"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Venus Legacy - Ruky, paže"></iframe>
```

### Venus Legacy - Stehná / zadok / brucho / chrbát (40 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=86a73d2a-8757-4e2e-a21c-a2715f2cd1e1"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Venus Legacy - Stehná / zadok / brucho / chrbát"></iframe>
```

### Venus Legacy tvár (40 min)

```html
<iframe src="https://profil.oasislounge.sk/cosmetics/embed?sluzba=c2bc4727-ce41-4dfa-a08c-bb5faf0337e3"
        class="oasis-terminy" style="width:100%;border:0" height="760"
        title="Voľné termíny – Venus Legacy tvár"></iframe>
```

## Poznámky

- Trieda `oasis-terminy` musí zostať — podľa nej skript pozná, ktorý rám má zväčšiť.
- `height="760"` je len východisková výška, kým sa kalendár načíta. Skript ju potom dorovná.
- Kalendár ukazuje iba voľné termíny, žiadne mená ani údaje klientok.
- Kliknutie na čas otvorí rezerváciu v novej záložke s predvyplnenou procedúrou, dátumom aj časom.
