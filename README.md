# SIDEQUEST — Career Campaign Planner

Your career change, played like a retro RPG campaign. Build your character (current job + skill inventory), pick the final boss (target role), and get back an honest read, a month-by-month quest log, a skill-stats radar, an XP curve, and curated power-ups.

Powered by **Gemini 3.7 Flash** with **live Google Search grounding** — the plan is based on what the target company and role actually look like right now, and the sources it used are listed in the plan.

## Run it

```bash
npm install
npm run dev
```

Open the printed localhost URL, paste your Gemini API key into the "Insert Cartridge" panel, and press Start.

## Gemini API key

- Create a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
- The key is entered in the app, kept in your browser's `localStorage`, and sent only to Google's Gemini API — there is no backend and no proxy.

## Stack

- [Vite](https://vitejs.dev/) + React 19
- [Tailwind CSS v4](https://tailwindcss.com/) for utility classes (the retro design system is plain CSS)
- [Recharts](https://recharts.org/) for the radar and XP charts
- [`@google/genai`](https://www.npmjs.com/package/@google/genai) calling `gemini-3.7-flash` with the built-in `googleSearch` tool

## Build

```bash
npm run build
npm run preview
```
