# Douyin Web Message Exporter Design

## Goal

Build a local Chrome extension that helps the account owner export selected Douyin web private-message conversations to JSON and CSV.

The extension must work only from the visible Douyin web UI after the user has logged in. It must not read passwords, copy browser cookies, bypass login, call hidden private APIs, or attempt to evade Douyin access controls.

## Confirmed User Flow

1. The user opens Douyin web in Chrome and stays logged in.
2. The user clicks the local extension.
3. The extension locates the top-right icon area and clicks the fifth icon, "私信". The expected order is:
   - 充钻石
   - 客户端
   - 壁纸
   - 通知
   - 私信
4. Douyin shows the message list.
5. The extension scans only the message list and extracts lightweight selection data:
   - conversation name
   - latest message preview
   - visible time hint in the list
6. The extension shows the available conversations in its popup or in-page panel.
7. The user selects one or more conversations.
8. Only the selected conversations are opened and parsed in full.
9. The extension exports:
   - `douyin_messages.json`
   - `douyin_messages.csv`

## Scope

The extension should extract as much as the page visibly exposes for selected conversations:

- conversation name
- message direction or sender clue
- visible message time
- text content
- media type, such as image, video, emoji, attachment, or unknown media
- media URL when it is visible in the DOM
- card, work, product, or other link URL when visible
- emoji or attachment description when visible

The extension should not export all conversations automatically. It first builds a selectable conversation list, then exports only the conversations chosen by the user.

## Non-Goals

The extension will not:

- export conversations before the user selects them
- record raw visible text as an extra field
- record raw HTML snippets
- record capture timestamps
- read or store cookies, tokens, passwords, or browser profile files
- use undocumented network endpoints as the primary extraction method
- bypass Douyin rate limits, login requirements, permissions, or account controls
- guarantee access to messages that Douyin web does not load into the page

## Architecture

### Chrome Extension

The extension will use Manifest V3 and target only Douyin web pages.

Main pieces:

- `manifest.json`: declares permissions, host matches, action popup, and content script.
- Popup UI: starts scanning, shows the conversation list, lets the user choose conversations, and starts export.
- Content script: runs on Douyin pages, clicks the message button, scans visible conversation rows, opens selected conversations, scrolls message history, and extracts structured data.
- Export helper: converts extracted records into JSON and CSV files and triggers local downloads.

### Two-Stage Extraction

Stage 1: Conversation list scan

- Open the message list from the top-right "私信" button.
- Read conversation rows from the visible message list.
- Scroll the list if needed to discover more conversations.
- Store only selection fields: conversation name, latest preview, and list time hint.
- Present the list for user selection.

Stage 2: Selected conversation export

- For each selected conversation, open the conversation.
- Scroll through the chat area to load available history.
- Deduplicate messages while scrolling.
- Parse each visible message into a structured record.
- Export only the selected conversations.

## Output Format

### JSON

The JSON file will contain an array of conversations:

```json
[
  {
    "conversationName": "示例联系人",
    "messages": [
      {
        "direction": "incoming",
        "sender": "示例联系人",
        "time": "昨天 18:20",
        "text": "你好",
        "mediaType": null,
        "mediaUrl": null,
        "linkUrl": null,
        "attachmentDescription": null
      }
    ]
  }
]
```

### CSV

The CSV file will flatten messages into rows:

- conversationName
- direction
- sender
- time
- text
- mediaType
- mediaUrl
- linkUrl
- attachmentDescription

## Matching and Selection Behavior

The extension should avoid automatic guessing when the page is ambiguous.

- If the message list cannot be opened, it should show a clear error and ask the user to open the message center manually.
- If conversation rows cannot be parsed, it should show the user a manual retry option.
- If a selected conversation cannot be opened, it should skip that conversation and report it in the export summary.
- If message fields are missing, it should leave the corresponding output value empty rather than inventing data.

## Privacy and Safety

All extraction and export happen locally in the user's browser. The extension should not send message content to any external service.

The extension should make the user explicitly select conversations before full-message parsing begins. This keeps the tool aligned with personal backup use and avoids silently processing every private conversation.

## Testing Plan

Manual test cases:

- Load extension in Chrome developer mode.
- Open Douyin web while logged in.
- Click the extension and verify it opens the message list using the fifth top-right icon.
- Verify the conversation list shows names, latest previews, and visible time hints.
- Select one conversation and export JSON/CSV.
- Select multiple conversations and export JSON/CSV.
- Verify unselected conversations are not opened or exported.
- Verify outputs do not contain raw text fields, raw HTML fields, or capture timestamp fields.
- Verify missing media links become empty fields rather than breaking export.

## Known Risks

Douyin web DOM names and layout may change. The implementation should use resilient DOM heuristics and clear errors rather than assuming one brittle selector.

Some media URLs may be temporary, blob-based, or absent from the DOM. In those cases, the extension should record media type and description when visible, leaving the URL empty.

Older messages may require scrolling and may not be available if Douyin web does not load them. The extension can only export messages visible or loadable in the web UI.
