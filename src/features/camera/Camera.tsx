import { use, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import type { Frame } from '../../model/frame';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { useAnnounce } from '../../ui/useAnnounce';
import { useSlotParam } from '../pick/useSlotParam';
import { CameraContext } from './CameraContext';
import { DARK_MESSAGE, PANELS, PHOTO_FAILED } from './copy';
import { initialLowLight, meanLightness, nextLowLight } from './lightness';
import { FRAME_MAX_SIDE, SAMPLE_INTERVAL_MS, SAMPLE_SIDE, type CameraFailure } from './port';

const styles = stylex.create({
  // No overflow clipping here: the 200% text size check in
  // e2e/invariants.spec.ts fails any element that hides its own overflow.
  viewfinder: {
    position: 'relative',
    flex: '1',
    minHeight: '240px',
    backgroundColor: tokens.dark,
    borderRadius: tokens.radius,
  },
  video: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: tokens.radius,
  },
  guide: {
    position: 'absolute',
    inset: '15%',
    borderWidth: '2px',
    borderStyle: 'dashed',
    borderColor: tokens.darkFg,
    borderRadius: tokens.radiusMedia,
    opacity: 0.35,
  },
  banner: {
    backgroundColor: tokens.dark,
    color: tokens.darkFg,
    borderRadius: tokens.radiusMedia,
    fontSize: tokens.textBody,
    lineHeight: 1.4,
    margin: 0,
    paddingBlock: '12px',
    paddingInline: '16px',
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  shutter: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    borderWidth: '4px',
    borderStyle: 'solid',
    borderColor: tokens.dark,
    backgroundColor: tokens.darkFg,
    cursor: 'pointer',
    padding: 0,
  },
  // The same shape as the picker's secondary link, for the same reason: the
  // token is the hit-target invariant, and `inline-flex` lets it apply.
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    color: tokens.ink,
    fontFamily: tokens.fontBody,
    fontSize: tokens.textBody,
    textAlign: 'center',
  },
  linkButton: {
    backgroundColor: 'transparent',
    borderStyle: 'none',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    alignSelf: 'center',
  },
  panel: { display: 'flex', flexDirection: 'column', gap: '12px' },
  panelHeading: {
    fontFamily: tokens.fontHeading,
    fontSize: tokens.textBody,
    margin: 0,
  },
  body: { color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5, margin: 0 },
});

type Status = 'opening' | 'live' | CameraFailure;

function stopTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

/**
 * Framing a garment, or choosing a photo of one.
 *
 * Denied, unavailable and too dark are designed states rather than errors,
 * because all three are ordinary: people refuse permissions, and wardrobes are
 * dim. The shutter still works in the dark. The warning says why a read may
 * be poor and puts the two alternatives in reach, and the confirm step (#21)
 * is where a poor read gets corrected. Blocking the shutter would punish the
 * common case on a threshold nobody has tuned yet.
 *
 * Nothing links here until #21 exists, so the navigation to `/confirm` below
 * cannot be reached in the shipped app until then.
 */
export function Camera() {
  const slot = useSlotParam();
  if (!slot) return <Navigate to="/slot?next=camera" replace />;
  return <CameraForSlot slot={slot} />;
}

function CameraForSlot({ slot }: { slot: Slot }) {
  const camera = use(CameraContext);
  const navigate = useNavigate();
  const { dispatch } = useSession();
  const announce = useAnnounce();
  const video = useRef<HTMLVideoElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('opening');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [lowLight, setLowLight] = useState(initialLowLight);
  const [photoFailed, setPhotoFailed] = useState(false);
  // False once the screen has gone. A large photo can take a second to
  // decode, and by then the user may have picked by hand or gone back. Acting
  // on it then would pull them to /confirm from wherever they went.
  const here = useRef(true);

  useEffect(() => {
    here.current = true;
    return () => {
      here.current = false;
    };
  }, []);

  // Asked for on arrival. The user picked the camera on the screen before, so
  // a pre-prompt would only ask the same question twice.
  useEffect(() => {
    let gone = false;
    let opened: MediaStream | null = null;
    void camera.open().then((result) => {
      if (!result.ok) {
        if (!gone) setStatus(result.reason);
        return;
      }
      // A stream that arrives after the screen has gone would keep the
      // camera light on with nothing showing it.
      if (gone) {
        stopTracks(result.stream);
        return;
      }
      opened = result.stream;
      setStream(result.stream);
      setStatus('live');
    });
    return () => {
      gone = true;
      if (opened) stopTracks(opened);
    };
  }, [camera, attempt]);

  useEffect(() => {
    if (status === 'live' && stream && video.current) camera.attach(video.current, stream);
  }, [camera, status, stream]);

  useEffect(() => {
    if (status !== 'live') return;
    const id = setInterval(() => {
      if (document.hidden || !video.current) return;
      const frame = camera.readFrame(video.current, SAMPLE_SIDE);
      if (frame) setLowLight((state) => nextLowLight(state, meanLightness(frame.pixels)));
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [camera, status]);

  const dark = status === 'live' && lowLight.dark;
  const panel = status === 'opening' || status === 'live' ? null : PANELS[status];

  // The panel replaces the viewfinder after the permission prompt, with no
  // focus move to carry the news, so it goes through the live region.
  useEffect(() => {
    if (panel) announce(panel.heading);
  }, [panel, announce]);

  // Said once on the way into the dark, not on every sample that stays there.
  // The banner arrives with no focus move to carry it, which is what the live
  // region is for (A11Y.md).
  useEffect(() => {
    if (dark) announce(DARK_MESSAGE);
  }, [dark, announce]);

  function captured(frame: Frame) {
    dispatch({ type: 'frameCaptured', slot, frame });
    void navigate(`/confirm?slot=${slot}`);
  }

  function shoot() {
    if (!video.current) return;
    const frame = camera.readFrame(video.current, FRAME_MAX_SIDE);
    if (frame) captured(frame);
  }

  async function photoChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Cleared straight away so that choosing the same file again still fires
    // `change`.
    event.target.value = '';
    if (!file) return;
    const result = await camera.readPhoto(file, FRAME_MAX_SIDE);
    if (!here.current) return;
    if (result.ok) {
      captured(result.frame);
      return;
    }
    setPhotoFailed(true);
    announce(PHOTO_FAILED);
  }

  function retry() {
    // The focused button goes with the panel. The heading stays on screen
    // through every state, so focus waits there, as it does when a toast
    // leaves (ToastHost).
    document.querySelector<HTMLElement>('main h1')?.focus();
    setStatus('opening');
    setAttempt((n) => n + 1);
  }

  const pickByHand = (
    <Link to={`/color?slot=${slot}`} {...stylex.props(styles.link)}>
      Pick by hand
    </Link>
  );

  const choosePhoto = (
    <>
      <button
        type="button"
        onClick={() => photoInput.current?.click()}
        {...stylex.props(styles.link, styles.linkButton)}
      >
        Choose a photo
      </button>
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void photoChosen(event)}
      />
      {photoFailed && <p {...stylex.props(styles.body)}>{PHOTO_FAILED}</p>}
    </>
  );

  if (panel) {
    return (
      <Screen title="Frame the garment">
        <section aria-labelledby="camera-panel" {...stylex.props(styles.panel)}>
          <h2 id="camera-panel" {...stylex.props(styles.panelHeading)}>
            {panel.heading}
          </h2>
          <p {...stylex.props(styles.body)}>{panel.body}</p>
          {status === 'failed' && <Button label="Try again" onClick={retry} />}
          {pickByHand}
          {choosePhoto}
        </section>
      </Screen>
    );
  }

  return (
    <Screen title="Frame the garment">
      {dark && <p {...stylex.props(styles.banner)}>{DARK_MESSAGE}</p>}
      {/* Hidden from assistive technology: the screen works without seeing
          the picture, and a video announced as "video" tells nobody
          anything. */}
      <div aria-hidden="true" {...stylex.props(styles.viewfinder)}>
        {status === 'live' && (
          <video ref={video} playsInline muted autoPlay {...stylex.props(styles.video)} />
        )}
        <div {...stylex.props(styles.guide)} />
      </div>
      <div {...stylex.props(styles.controls)}>
        {dark && pickByHand}
        {status === 'live' && (
          <button
            type="button"
            aria-label="Take photo"
            onClick={shoot}
            {...stylex.props(styles.shutter)}
          />
        )}
      </div>
      {choosePhoto}
    </Screen>
  );
}
