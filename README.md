# Brainfeed for Obsidian

Sync your [Brainfeed](https://brainfeed.ai) content to Obsidian and send notes back to Brainfeed for AI summarization.

## Features

- **Pull sync** — Import summaries, key points, highlights, full text, and metadata from Brainfeed into your vault as Markdown files with frontmatter.
- **Push to Brainfeed** — Send any note from Obsidian to Brainfeed for AI-powered summarization.
- **Auto-sync** — Optionally sync on a schedule (every 5, 15, 30, or 60 minutes).
- **Content scope** — Choose exactly which sections to include: summary, key points, annotations, full text, and metadata.

## Setup

1. Install the plugin from Obsidian's Community Plugins browser (or manually copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/brainfeed/`).
2. Open **Settings → Brainfeed**.
3. Enter your Brainfeed API key (find it at [brainfeed.ai](https://brainfeed.ai) under Settings → API Keys).
4. Click **Verify** to confirm the connection.

## Usage

### Sync from Brainfeed

- Click the refresh icon in the ribbon, or run the **Sync from Brainfeed** command.
- Content is saved as Markdown files in the sync folder (default: `Brainfeed/`).
- Only new or updated items are pulled on each sync.

### Send to Brainfeed

- Open a note, then run the **Send to Brainfeed** command.
- The note will be sent to Brainfeed for AI summarization.

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| API URL | Brainfeed API endpoint | `https://brainfeed.ai` |
| API Key | Your Brainfeed API key | — |
| Sync Folder | Vault folder for synced content | `Brainfeed` |
| Auto-sync interval | Automatic sync frequency | Disabled |
| Summary | Include AI summary | On |
| Key Points | Include key points | On |
| Highlights / Annotations | Include your highlights | On |
| Full Text | Include original full text | On |
| Metadata | Include source URL, author, date, topics | On |
