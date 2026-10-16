import { LIGHTS, LIGHT_LABELS, type Light } from '../../../model/field';
import { ChipGroup } from './ChipGroup';
import { LIGHT_GROUP } from './copy';

const OPTIONS = LIGHTS.map((light) => ({ value: light, label: LIGHT_LABELS[light] }));

/** The light a capture is taken in, chosen by hand. */
export function LightChips({
  value,
  onChange,
}: {
  value: Light | null;
  onChange: (light: Light) => void;
}) {
  return <ChipGroup label={LIGHT_GROUP} options={OPTIONS} value={value} onChange={onChange} />;
}
