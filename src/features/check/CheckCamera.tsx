import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { Frame } from '../../model/frame';
import { useSession } from '../../session/useSession';
import { CaptureScreen } from '../camera/CaptureScreen';
import { CAPTURE_TITLE, OUTFIT_CAPTURE } from './copy';

/**
 * Framing a whole outfit, the start of a check (#23).
 *
 * Arriving here starts a new check, so a second outfit never inherits the
 * first one's colors. The hand-entry link goes to the list, where the colors
 * are entered without a photo; that route is what keeps the check usable when
 * the camera is blocked or the photo will not read.
 */
export function CheckCamera() {
  const { dispatch } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch({ type: 'checkStarted' });
  }, [dispatch]);

  function captured(frame: Frame) {
    dispatch({ type: 'checkPhotoTaken', frame });
    void navigate('/check/tap');
  }

  return (
    <CaptureScreen
      title={CAPTURE_TITLE}
      guide="outfit"
      copy={OUTFIT_CAPTURE}
      handEntry="/check/pieces"
      alwaysOfferHandEntry
      onFrame={captured}
    />
  );
}
