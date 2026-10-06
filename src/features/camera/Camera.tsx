import { useNavigate } from 'react-router';
import { Redirect } from '../../ui/Redirect';
import type { Frame } from '../../model/frame';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { useSlotParam } from '../pick/useSlotParam';
import { CaptureScreen } from './CaptureScreen';
import { SLOT_TITLE } from '../pick/copy';
import { GARMENT_CAPTURE, GARMENT_CAPTURE_TITLE } from './copy';

/** The garment camera: `CaptureScreen` for one slot, handing its frame to the confirm step. */
export function Camera() {
  const slot = useSlotParam();
  if (!slot) return <Redirect to="/slot?next=camera" />;
  return <CameraForSlot slot={slot} />;
}

function CameraForSlot({ slot }: { slot: Slot }) {
  const navigate = useNavigate();
  const { dispatch } = useSession();

  function captured(frame: Frame, lowLight: boolean | null) {
    dispatch({ type: 'frameCaptured', slot, frame, lowLight });
    void navigate(`/confirm?slot=${slot}`);
  }

  return (
    <CaptureScreen
      title={GARMENT_CAPTURE_TITLE}
      back={{ to: '/slot?next=camera', title: SLOT_TITLE }}
      guide="garment"
      copy={GARMENT_CAPTURE}
      handEntry={`/color?slot=${slot}`}
      onFrame={captured}
    />
  );
}
