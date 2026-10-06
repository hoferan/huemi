# 0020. Field captures are stored on the device

Status: Accepted, 2026-10-06. Amends ADR 0013 for field captures.

## Context

Milestone nine is about trusting the camera, and the reader has never been measured
in the light the app is used in (ADR 0019). Measuring it takes frames shot on the
phone, in a wardrobe, under a lamp or in a shop, each with a known answer. Those
frames then have to reach the PC, where the reader is tuned. #113 asks for the tool
that gathers them.

ADR 0013 says a camera frame is never stored at all. It lives in the session from
capture to confirmation and is gone on reload, so no set of frames can be built up
under that rule.

ADR 0017 removed the correction log, the last data huemi gathered for the reader. The
log ran in the background for every user and recorded the hex the camera read next to
the hex the user chose. Nothing in it said whether the user's choice was the garment's
real color or one they simply liked better, so it had no ground truth to score the
reader against. A field set is recorded on purpose, by someone in developer mode. Each
garment's true color is fixed by eye in daylight, by a window, before the garment is
photographed in harder light, so a reading can be checked against an answer that did
not come from the reader.

A backend that collects readings is still deferred (#64, #100), for the reason ADR
0019 gives: the only person recording is the developer, who can carry a phone to a PC.

## Decision

The field recorder stores camera frames, and nothing else in huemi does. It stores
them on the device only, only while developer mode is on, and only when someone
records.

The recorder lives under `/dev/field`, in `src/features/dev/field/`. A garment there is
a label and one to three true colors, matched by a window in daylight. Its capture
screen is the app's own camera screen with the light chosen by hand. It never shows
the reading, so the set does not lean toward what the reader already gets right.

In normal use, a Record switch fills the confirm screen's `confirm.actions` slot.
While it is on, each color the user settles on saves the frame along with that color.
Such a capture carries a weaker truth, the color the user accepted or corrected to,
until it is linked to a garment from the recorder's list. The switch stays on from one
visit to the next, but the light is asked for again in each browser session, and
nothing is recorded until it is chosen. A new session is likely in another place, and
a light carried over from the last one would mislabel every capture until someone
noticed.

A frame is stored as the RGBA pixels the reader reads, at most `FRAME_MAX_SIDE` on its
long side, with the light, the low-light warning at the shutter, the time and the
build's commit. `src/model/field.ts` has the types. Everything goes in IndexedDB, in
the `huemi-field` database, whose stores are `garments`, `captures`, `frames` and
`meta` (`src/storage/indexedDbField.ts`). The pixels sit in their own store because
they are far larger than the record that describes them. `meta` holds the set's id.

Frames leave the device only when someone exports them, and then only through the
share sheet or a download, the two ways ADR 0018 lets an outfit leave. The export is
one gzipped JSON file, `huemi-field-YYYY-MM-DD.json.gz`, at version 1, with each frame
in base64. `src/model/fieldExport.ts` writes and reads the format.

Every export is a whole snapshot of the set on that device. It carries a `setId`, a
random id the device makes at its first export and keeps in `meta`.
`mergeFieldExports` keeps only the newest export of each set, so a capture deleted on the phone stays deleted when an older export of the same
set is merged with a newer one. It then unions the sets that remain, and where two
sets hold the same id, the newer export wins. Exporting again after more captures is
safe, and so is merging every file ever copied over.

The file is written as a stream. The head with the garments goes into the gzip first,
then each capture: its frame is read, encoded and written before the next is read.
Building the file awaits the store, every frame and the gzip, and Safari refuses a
share once the tap's activation has passed through an await. On a device with a share
sheet, Export therefore builds the file and a second tap, Share the export, hands it
on. Without a share sheet, Export downloads the file in one step
(`src/features/dev/field/exportFieldSet.ts`). huemi still sends nothing over the
network, and the lint rule needs no exemption.

## Consequences

ADR 0013 holds for anyone who never turns on developer mode, which is every user
except the developer. With the mode off, nothing opens `huemi-field`. A stranger who
gets past the passphrase (ADR 0019) can record only their own frames on their own
phone.

Each capture takes about 0.8 MB of the phone's storage, the size of a 4:3 frame 512
pixels on its long side at four bytes a pixel. The recorder's list shows the capture
count and the size of the frames as stored.

Only the recorder deletes captures. A garment's page deletes one capture at a time, or
the garment with all its captures. The list deletes a capture from normal use that is
not linked yet, one at a time. Locking developer mode leaves the set where it is.
Clearing site data loses it, and only an earlier export can bring it back.

The browser can clear the set on its own, too. The first save in a page session asks
it to keep the site's storage (`navigator.storage.persist()`), and a browser that
agrees will not clear it to free space. That does not cover Safari's other rule: a site
open in a Safari tab that goes seven days without a visit may lose all its storage. A
web app added to the home screen counts only the days it is opened, so it keeps its
storage while it is in use. Record from the installed app, then, and export after each
session of recording.

The export holds one frame in memory at a time, plus the compressed file built so far,
so its peak memory is about one frame plus the compressed file. Exports stay whole-set
snapshots, so that file still grows with the set, and nothing splits it yet.

Two devices that export on the same day write files with the same name, so the second
copied into a folder would replace the first. Rename one when copying. The files
themselves cannot be confused, since each carries its own `setId`.

The export format is a contract with the files already copied to the developer's PC,
so a change to it needs a new version number and a reader that still accepts
version 1. The same holds for the database: `onupgradeneeded` creates each version's
stores only when the old version is below it, so a later version adds its stores and
keeps these. The reader's benchmark (#114) will decode those files with
`decodeFieldExport` and combine them with `mergeFieldExports`. Every truth in them
comes from one person's eye in daylight, so the benchmark will measure the reader
against the developer, the only user milestone nine has.
