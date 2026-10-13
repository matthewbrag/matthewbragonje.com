# matthewbragonje.com

Source for my personal site: writing on machine learning, software, and hardware experiments, plus a couple of interactive demos.

Live at [matthewbragonje.com](https://matthewbragonje.com).

## What's here

- **Writing** (`src/content/writing/`) — posts like benchmarking a 27B model across three RTX 3090s, what target ROAS optimization actually does, and trying to solve a hexagonal puzzle with linear algebra.
- **Interactive components** (`src/components/`) — `AuctionSim` and `SmartBiddingSim` (embedded in the bidding post), and `HexGame` (embedded in the puzzle post).
- **Search** — full-text search via [Pagefind](https://pagefind.app/), built at deploy time.
- **Math/code rendering** — KaTeX for math, Expressive Code/Shiki for syntax-highlighted code blocks.

## Stack

[Astro](https://astro.build/), MDX for posts with embedded components, Pagefind for search.

## Running locally

```bash
npm install
npm run dev
```

```bash
npm run build    # builds the site and the Pagefind index
npm run preview
```

## Credit

Originally based on the [Zen](https://github.com/Secd0g/zen) Astro blog theme.
