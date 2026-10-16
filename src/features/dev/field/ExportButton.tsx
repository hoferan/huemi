import { use, useEffect, useRef, useState } from 'react';
import { useSession } from '../../../session/useSession';
import { Button } from '../../../ui/Button';
import { ShareContext } from '../../share/ShareContext';
import { EXPORT, EXPORTED, EXPORT_FAILED, PREPARING_EXPORT, SHARE_EXPORT } from './copy';
import { buildFieldExport, deliverFieldExport, type ExportOutcome } from './exportFieldSet';
import { FieldStoreContext } from './FieldStoreContext';

/** Where an export is: nothing yet, being built, or built and waiting for its tap. */
type Exporting =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'ready'; file: File; snapshot: readonly unknown[] };

const IDLE: Exporting = { status: 'idle' };

const same = (a: readonly unknown[], b: readonly unknown[]): boolean =>
  a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * Export, then Share the export: the whole field set as one file. The first
 * tap builds the file. With a share sheet the second tap shares it, since
 * the build's awaits use up the tap's user activation. Without one, a
 * download needs no activation, so it happens straight away.
 *
 * `snapshot` is what the caller shows of the set, compared by identity. A
 * file built before any of it changed holds the old set, so it is dropped and
 * never shared. `onPreparing` hears when a build starts and ends, so the
 * caller can hold back anything that would change the set mid-build: the
 * build reads the captures one at a time, and a delete or link landing then
 * fails it.
 */
export function ExportButton({
  disabled = false,
  snapshot = [],
  onPreparing,
}: {
  disabled?: boolean;
  snapshot?: readonly unknown[];
  onPreparing?: (preparing: boolean) => void;
}) {
  const store = use(FieldStoreContext);
  const share = use(ShareContext);
  const { dispatch } = useSession();
  const [exporting, setExporting] = useState<Exporting>(IDLE);
  // Set while the share sheet is up: Chrome rejects a second share then, and
  // the person would read that as a failure.
  const sharing = useRef(false);
  const shareButton = useRef<HTMLButtonElement>(null);
  const preparing = exporting.status === 'preparing';
  const prepared =
    exporting.status === 'ready' && same(exporting.snapshot, snapshot) ? exporting.file : null;

  // The share button appears after Export went disabled, which dropped focus.
  useEffect(() => {
    if (prepared) shareButton.current?.focus();
  }, [prepared]);

  const toast = (message: string) => dispatch({ type: 'toastShown', message });

  async function prepare() {
    const taken = snapshot;
    setExporting({ status: 'preparing' });
    onPreparing?.(true);
    let next: Exporting = IDLE;
    try {
      const file = await buildFieldExport({ store });
      if (file === 'failed') {
        toast(EXPORT_FAILED);
      } else if (share.canShareFiles([file])) {
        next = { status: 'ready', file, snapshot: taken };
      } else {
        await deliverFieldExport(share, file);
        toast(EXPORTED);
      }
    } catch {
      toast(EXPORT_FAILED);
    } finally {
      setExporting(next);
      onPreparing?.(false);
    }
  }

  // Synchronous up to the share, which must start inside the click.
  function send(file: File) {
    if (sharing.current) return;
    sharing.current = true;
    void deliverFieldExport(share, file)
      .catch((): ExportOutcome => 'failed')
      .then((outcome) => {
        sharing.current = false;
        // A closed sheet keeps the file, so the person can try again.
        if (outcome === 'failed') {
          toast(EXPORT_FAILED);
        } else if (outcome !== 'dismissed') {
          toast(EXPORTED);
          setExporting(IDLE);
        }
      });
  }

  return (
    <>
      <Button
        label={preparing ? PREPARING_EXPORT : EXPORT}
        variant="secondary"
        disabled={disabled || preparing}
        onClick={() => void prepare()}
      />
      {prepared && <Button ref={shareButton} label={SHARE_EXPORT} onClick={() => send(prepared)} />}
    </>
  );
}
