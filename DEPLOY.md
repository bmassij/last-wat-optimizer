# ORC — Deploy naar Vercel

## Vereisten
- Node.js 18+ geïnstalleerd
- Git geïnstalleerd
- Gratis Vercel account (vercel.com)

---

## Stap 1 — Dependencies installeren

Open een terminal in de `orc-app` map en run:

```bash
npm install
```

Test lokaal:
```bash
npm run dev
```
Open http://localhost:3000 — je ziet de ORC dashboard.

---

## Stap 2 — GitHub repo aanmaken

1. Ga naar github.com → New repository
2. Naam: `orc-app` (of wat je wilt)
3. Public of Private — maakt niet uit voor Vercel
4. **Geen** README aanmaken (staat al in dit project)

In de terminal:
```bash
cd orc-app
git init
git add .
git commit -m "ORC v2 — initial commit"
git remote add origin https://github.com/JOUWNAAM/orc-app.git
git push -u origin main
```

---

## Stap 3 — Deploy op Vercel

### Optie A — Via Vercel website (makkelijkst)
1. Ga naar vercel.com en log in
2. Klik **Add New → Project**
3. Importeer je GitHub repo `orc-app`
4. Framework = **Next.js** (auto-detected)
5. Klik **Deploy**
6. Klaar — je krijgt een URL zoals `orc-app.vercel.app`

### Optie B — Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## Automatische deploys
Elke keer dat je naar GitHub pusht, deployt Vercel automatisch.

---

## Geen environment variables nodig
ORC gebruikt geen externe APIs of databases — alles draait client-side.
