# 0018. Sharing is the user handing data on

Status: Accepted, 2026-10-05. Leaves ADR 0013 in force.

## Context

Milestone eight lets a user share an outfit (#107, #108, #109). A share is a PNG of
the outfit, a sentence naming its pieces, and a link that opens the outfit in huemi.
ADR 0013 says huemi sends nothing over the network, and `eslint.config.js` enforces it
by restricting `fetch` and the other network globals in `src/`.

An outfit leaves the phone in three ways:

- through the system share sheet (`navigator.share`), into an app the user picks
- through the clipboard and a download, on a browser with no share sheet
- through the link itself, which carries the colors to whoever opens it

## Decision

Sharing happens only through the share sheet, or the clipboard and a download.
Nothing moves until the user taps Share. With a share sheet the user then picks
where it goes; without one it stays on the device, in the clipboard and the
downloads folder, until the user pastes or sends it. huemi sends nothing anywhere
itself. ADR 0013 stands, and the lint rule needs no exemption, since neither
`navigator.share` nor `navigator.clipboard` is on its list.

The link carries the outfit in its query string, one bare hex per piece and the base
slot, as `src/features/share/link.ts` writes it. Whoever receives it can read the
colors. So can the messaging service the link travels through, whose preview crawler
usually fetches it as soon as it is sent, and Netlify, whose request logs record
every fetch. That is what the link is for, and it carries nothing beyond the colors
and the base slot: no photo, outfit name or note.

## Consequences

Anyone holding a shared link can open the outfit, and nothing can revoke a link once
it is sent.

The link format is now a contract with links already out in chats. `parseShareLink`
has to go on reading every form `shareLink` has ever written, so a change to the slot
list needs a reader for the old form as well as a writer for the new one.

A link preview showing the outfit, through an `og:image` per link, would need a server
to render it. It stays out of scope while huemi is a static app (ADR 0001).
