import { Navigate, useNavigate } from 'react-router';
import type { Frame } from '../../model/frame';
import type { Slot } from '../../model/types';
import { useSession } from '../../session/useSession';
import { useSlotParam } from '../pick/useSlotParam';
import { CaptureScreen } from './CaptureScreen';
import { GARMENT_CAPTURE } from './copy';

/** The garment camera: `CaptureScreen` for one slot, handing its frame to the confirm step. */
export function Camera() {
  const slot = useSlotParam();
  if (!slot) return <Navigate to="/slot?next=camera" replace />;
  return <CameraForSlot slot={slot} />;
}

function CameraForSlot({ slot }: { slot: Slot }) {
  const navigate = useNavigate();
  const { dispatch } = useSession();

  function captured(frame: Frame) {
    dispatch({ type: 'frameCaptured', slot, frame });
    void navigate(`/confirm?slot=${slot}`);
  }

  return (
    <CaptureScreen
      title="Frame the garment"
      guide="garment"
      copy={GARMENT_CAPTURE}
      handEntry={`/color?slot=${slot}`}
      onFrame={captured}
    />
  );
}
