# Annual Rafting Trip 2026 — Vote & Availability

A tiny static website (no backend) for our family + the family-friend couple to
pick **where** and **when** to go rafting in Oregon / Washington this year.

- The 4 shortlisted trips are described in [`PROPOSAL.md`](PROPOSAL.md).
- Everyone visits the site, votes for their favorite trip, checks the weekends
  they're free, and the results page shows the **dates everyone is available**
  and the **group favorite destination**.

## Run it locally

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Running the tests

```bash
npm install
npm test
```

The test suite (`tests/site.test.js`) exercises the whole site in a simulated
browser: every trip card, every date option, vote saving/clearing/validation,
the best-date logic across all availability combinations, the tally, the
availability table, share-link round-trips, and XSS escaping.

## How the voting works (important)

This is a **static site on GitHub Pages** — there's no server or database, so
votes are stored in the browser's `localStorage` on each device. To combine
everyone's answers:

1. Each household opens the site on their own device and casts their vote.
2. They click **"Copy my vote link"** and send the link to the organizer
   (text / email / WhatsApp). The link contains their vote.
3. The organizer opens each link on one device — each vote merges in
   automatically.
4. The results page now shows the combined picture. To show it to everyone,
   use **"Copy all-votes link"** or just share the screen.

Data only lives in each person's browser — nothing is uploaded anywhere.

## Hosting on GitHub Pages

1. Create a new GitHub repository (private or public).
2. Push these files to it (all of them — `index.html`, `css/`, `js/`,
   `PROPOSAL.md`, `README.md`). The repo name becomes part of the URL, e.g.
   `rafting-trip-2026` → `https://YOURNAME.github.io/rafting-trip-2026/`.
3. In the repo, go to **Settings → Pages**.
4. Under **Branch**, choose `main` (and the `/ (root)` folder), then **Save**.
5. Wait ~1 minute. Your site is live at the URL shown on that page.
6. Send that URL to everyone and start voting!

### If you'd rather keep votes server-side
The simplest upgrade is embedding a **Google Form** (or Google Sheet) and linking
it from this page, so votes collect in one place automatically. Happy to wire
that up if you'd like.

## Editing the options

Trip details and candidate weekends live in [`js/data.js`](js/data.js).
Change a price, add a new river, or update the date blocks — no other file
needs touching.

## Files

| File | Purpose |
|---|---|
| `index.html` | The page (hero, trips, vote form, results) |
| `css/style.css` | Styling |
| `js/data.js` | The 4 trips + candidate weekend dates |
| `js/app.js` | Voting, results, share-link logic |
| `PROPOSAL.md` | The full proposal for the 4 trips |
