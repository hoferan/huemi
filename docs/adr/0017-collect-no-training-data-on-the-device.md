# 0017. Collect no training data on the device

Status: Accepted, 2026-10-02. Removes the correction log that ADR 0013 kept on the
device.

## Context

From #22 (#85) on, huemi logged each time the user changed a color the camera read:
the slot, the hex the camera read, the hex the user chose, and when. #99 added the
case where the user left the confirm screen for the picker. ADR 0013 kept the log on
the phone and noted that nothing consumed it. #87 proposed a screen that would let the
user save it as a file for the harness.

The log was only worth anything as input for tuning the reader, and on the device it
reached nothing. Getting it out needs a user who exports a file and sends it to the
developer, which in practice means the developer's own phone. One person's
corrections are too few to tell reader error from noise, the problem #11 had with
preference data.

The reader is tuned during development already: a Claude Code session works against
the harness and the Polyvore benchmark, and the improved constants ship in a release.
An export adds a manual step to that loop and no data it lacks.

## Decision

huemi records no corrections. The log, its storage port and the session fields that
carried a reading to it are gone. On start, the app deletes the `huemi.corrections`
key that earlier versions wrote (`src/storage/forgetCorrections.ts`, pinned by the
scenario in `e2e/features/smoke.feature`).

The correction panel on the confirm screen stays. It lets the user fix a reading for
the outfit at hand, and it never depended on the log.

Collecting training data comes back only with a backend that stores and processes it,
and with the user's explicit consent to share. #100 describes that feature. Because
data would then leave the device, it needs a record that supersedes ADR 0013.

## Consequences

ADR 0013 stands, and covers two kinds of data now: the onboarding flag and saved
outfits.

The reader improves only through tuning during development. A miss seen in real use
reaches it when someone reports it or turns it into a harness fixture.

`forgetCorrections` runs on every start. It can go once no installed copy older than
this record is likely to be left.
