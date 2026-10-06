import { Redirect } from '../../../ui/Redirect';

// The field recorder's lazy chunk. `routes.tsx` loads it, so a build with
// developer mode off never fetches any of the kit.

export { FieldList } from './FieldList';
export { NewGarment } from './NewGarment';

/** A garment's page. Until it exists, a link to one lands on the list. */
export function GarmentPage() {
  return <Redirect to="/dev/field" />;
}

/** Capturing a garment. Until it exists, a link to it lands on the list. */
export function CaptureGarment() {
  return <Redirect to="/dev/field" />;
}
