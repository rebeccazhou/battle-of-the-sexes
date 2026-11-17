# Battle of the Sexes

A picture-naming party game for the projector, girls against boys. Thanksgiving 2026 Edition.

Live at https://floor-girls-vs-boys.vercel.app

## How it's built

- `site/index.html` is the whole app: one static page with no build step.
  - Home page with the rules, a practice round and the category list
  - Category builder with sign-in and an image finder (Wikipedia and Wikimedia Commons)
  - Host screen for the projector, and a judge view for a phone at `/#judge`
- Data lives in Supabase (tables prefixed `floor_`). `schema.sql` recreates them.
- Hosting is Vercel, project `floor-girls-vs-boys`.

## Run it locally

```bash
python3 -m http.server 8765 --directory site
```

Then open http://localhost:8765. It talks to the live database.

## Deploy

```bash
cd site && npx vercel deploy --prod
```

## Notes

- The Supabase key in `index.html` is the public anon key. Anyone with the link can add or remove categories, by design, so keep the link among the players.
- Passwords are stored hashed. To reset one, set `pass_hash` to null for that player in `floor_players`.
