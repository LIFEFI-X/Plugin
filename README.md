# Lifefi Browser Companion

Solana NFT Platform Frontend https://github.com/LIFEFI-X/Frontend  
Backend API https://github.com/LIFEFI-X/Backend

## Bringing Solana NFT creation into every browser tab

Lifefi is a Vue 3 + WXT browser extension crafted for Sol creators. It embeds AI-assisted editing, NFT metadata helpers, and direct rails to the Lifefi NFT platform, so creators can draft, polish, and mint directly from the pages where inspiration strikes.

## About Lifefi

Lifefi turns any text surface on the web into an NFT staging ground. Select content on blogs, docs, or social posts, invoke the floating toolbar, and the extension guides you through polishing copy, previewing NFT attributes, and sending finalized data to the Lifefi platform. All UI logic lives inside this repository, while mint pipelines, collections, and analytics are handled by the dedicated frontend and backend services linked above.

## Meet the ASoul Desktop Pet

- **Engagement quests**: Timed missions verify how long you read on X or watch on YouTube. Hitting 20s, 2min, 5min, or 10min milestones mints GPT credits directly into your balance, powering future AI calls.
- **Live progress HUD**: The mascot floats above every page with countdown text, reward popups, and particle animations whenever a milestone is auto-claimed.
- **GPT dispenser**: Double-click opens a chat window that spends the earned GPT on rewrite, translate, or ideation prompts backed by the same background AI stack as the toolbar.
- **Content curator**: Every 30 seconds the pet can surface curated Solana/X accounts (e.g., `@solana`) or long-form recommendations to guide you toward high-signal reading that satisfies quests faster.
- **Task hub**: The Task Panel details current missions, claimable chests, and cumulative balance so you always know how far you are from the next GPT drop.

## Key Features

### Context-Aware Writing Suite
- **Select-to-Improve**: Highlight any snippet to open the floating toolbar with rewrite, simplify, expand, and error-fix actions.
- **Ghost Text Suggestions**: Copilot-style grey prompts appear inline, accepted with `Tab` or dismissed with `Esc`.
- **Instant Replace & History**: Reviewed text swaps in-place, while every change is logged for undo or audit.
- **Desktop Companion Pet**: Engagement quests convert browsing time into GPT allotments, letting the mascot inject rewrite ideas plus premium content recommendations right inside the toolbar bubble.

### NFT-Ready Metadata Flow
- **Template Prompts**: Quickly structure NFT descriptions, attributes, and storytelling hooks before pushing to the platform.
- **Platform Bridge**: Send the curated text payload to the Lifefi frontend dApp, which passes it to the Solana backend for minting.
- **Rule-Based Draft Checks**: Early heuristics catch tone or formatting gaps before you spend RPC calls.

### Cross-Browser Developer Ergonomics
- **WXT Tooling**: Single codebase targeting Chrome, Edge, and Firefox via MV3 bundles.
- **Pinia State & VueUse Utilities**: Reactive stores keep AI responses, history, and Solana session data consistent.
- **Tailwind-Themed UI**: Rapidly themeable panels that match the main platform brand.

## Architecture

### Browser Extension Shell
- Popup, background, and content scripts live in `entrypoints/`, powered by WXT for manifest and build automation.
- Shared UI components (floating toolbar, history sidebar, prompt cards) reside in `components/`.
- State flows through Pinia stores in `stores/`, backed by typed contracts in `types/`.

### AI & Drafting Layer
- Utility helpers in `utils/` orchestrate local prompt presets and mock AI responses (replaceable with OpenAI/Claude/locally hosted models).
- Selection events are captured inside content scripts and routed to the background service for processing.
- `components/ASoulPet.vue` renders the mascot, `components/TaskPanel.vue` lists missions, and `components/ChatDialog.vue` funnels GPT prompts through `entrypoints/background.ts` so pet chatter and toolbar edits share the same quota.
- `utils/reward.ts`, `utils/tracking.ts`, and `utils/recommendations.ts` measure X/YouTube time, auto-claim GPT rewards, persist balances, and rotate curated Solana recommendations that the pet blurts out every 30 seconds.

### Solana Platform Connectivity
- The extension packages finalized metadata and opens deep links into the Lifefi web app (`Frontend` repo) for preview/mint actions.
- The web app talks to the `Backend` repo, which exposes the Solana RPC, metadata validation, and mint transactions.

## Solana Integration

- Focused on Solana programs for NFTs (Metaplex-compliant metadata, SPL token accounts).
- Supports SOL and SPL token fees, mirroring the capabilities inside the main Lifefi dApp.
- Plans include signature forwarding so extension users can sign via injected wallets without tab switching.

## Technical Specifications

- **Framework**: Vue 3 (Composition API) + TypeScript
- **Extension Toolkit**: WXT, webextension-polyfill
- **State & Utils**: Pinia, @vueuse/core, nanoid
- **Styling**: Tailwind CSS, PostCSS
- **Packaging Targets**: Chrome/Edge MV3, Firefox MV3
- **License**: MIT (see `LICENSE`)

## How It Works

1. **Engage with quests**: While you read X or watch YouTube, `entrypoints/content.ts` repeatedly calls `utils/tracking.ts` to verify domain activity and duration.
2. **Auto-claim GPT**: When durations match the milestones defined in `utils/reward.ts`, the pet animates, the Task Panel updates your GPT balance, and new prompts unlock.
3. **Draft with AI**: Select any text to bring up the toolbar or double-click the pet to open the chat dialog; both send GPT requests through the background script using the same earned credits.
4. **Curate & refine**: Accept inline rewrites, browse the history panel, or tap pet recommendations (powered by `utils/recommendations.ts`) for fresh Solana content ideas.
5. **Ship NFT metadata**: Push the approved copy as metadata to the Lifefi frontend dApp, finalize assets, and mint on Solana via the connected backend services.

## Development Setup

```bash
pnpm install          # install dependencies
pnpm dev              # run Chrome/Edge MV3 build
pnpm dev:firefox      # run Firefox MV3 build
```

Load the build artifacts under `.output/` into your target browser (see `QUICKSTART.md` for a three-minute smoke test). Production bundles and distributable zip files are generated via `pnpm build`, `pnpm build:firefox`, `pnpm zip`, and `pnpm zip:firefox`.

## Roadmap Highlights

- Configurable AI providers (OpenAI, Anthropic, local models)
- Wallet-aware UX that reflects on-chain holdings directly in the toolbar
- Template presets for common NFT drop formats and languages
- Visual diff mode before committing text to the platform
- Solana transaction simulator results surfaced inline
- Expanded pet quests (RSS/podcast missions, streak bonuses) plus NFT-based pet skins

## License

Lifefi Browser Companion is released under the MIT License. See the full text in `LICENSE`.



