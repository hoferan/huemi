import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { localPreferences } from '../../../storage/localPreferences';
import { useSession } from '../../../session/useSession';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { HOME } from '../../../ui/home';
import { Screen } from '../../../ui/Screen';
import { useOutfits } from '../../saved/useOutfits';
import { useDevMode } from '../useDevMode';
import { BUILD } from './build';
import { ClearOutfits } from './ClearOutfits';
import { browserWorker, type WorkerPort } from './worker';

const styles = stylex.create({
  section: { display: 'flex', flexDirection: 'column', gap: '12px' },
  heading: { fontFamily: tokens.fontHeading, fontSize: '1.25rem', margin: 0 },
  text: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
  list: { margin: 0, padding: 0, listStyle: 'none', color: tokens.ink2, fontSize: tokens.textBody },
  facts: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    columnGap: '12px',
    rowGap: '4px',
    margin: 0,
    fontSize: tokens.textBody,
  },
  term: { color: tokens.ink2 },
  value: { margin: 0, overflowWrap: 'anywhere' },
});

/**
 * The developer menu: what this build is, and the resets that otherwise mean
 * clearing site data by hand. It is a lazy chunk behind `DevRoute`, so none of
 * it ships to a visitor who never unlocks the mode.
 */
export default function DevMenu({ worker = browserWorker }: { worker?: WorkerPort }) {
  const { lock } = useDevMode();
  const { dispatch } = useSession();
  const { state, remove } = useOutfits();
  const navigate = useNavigate();
  const [caches, setCaches] = useState<string[] | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let current = true;
    void worker
      .cacheNames()
      .catch(() => [])
      .then((names) => {
        if (current) setCaches(names);
      });
    return () => {
      current = false;
    };
  }, [worker]);

  const toast = (message: string) => dispatch({ type: 'toastShown', message });
  const outfits = state.status === 'ready' ? state.outfits : [];

  async function clearOutfits() {
    setClearing(false);
    const ok = await remove(outfits.map((outfit) => outfit.id));
    toast(ok ? 'Saved outfits cleared.' : "Couldn't clear saved outfits.");
  }

  return (
    <Screen title="Developer mode" back={HOME}>
      <section {...stylex.props(styles.section)}>
        <h2 {...stylex.props(styles.heading)}>Build</h2>
        <dl {...stylex.props(styles.facts)}>
          <dt {...stylex.props(styles.term)}>Commit</dt>
          <dd {...stylex.props(styles.value)}>{BUILD.commit}</dd>
          <dt {...stylex.props(styles.term)}>Built</dt>
          <dd {...stylex.props(styles.value)}>{BUILD.date}</dd>
        </dl>
      </section>

      <section {...stylex.props(styles.section)}>
        <h2 {...stylex.props(styles.heading)}>App state</h2>
        <Button
          label="Reset onboarding"
          variant="secondary"
          onClick={() => {
            // No catch: the preference store swallows its own storage errors.
            void localPreferences
              .setOnboarded(false)
              .then(() => toast('Onboarding will show next time.'));
          }}
        />
        {outfits.length > 0 ? (
          <Button
            label="Clear saved outfits"
            variant="secondary"
            onClick={() => setClearing(true)}
          />
        ) : (
          // Silent while the list is still loading or unreadable: "none" would be a guess.
          state.status === 'ready' && <p {...stylex.props(styles.text)}>No saved outfits.</p>
        )}
      </section>

      <section {...stylex.props(styles.section)}>
        <h2 {...stylex.props(styles.heading)}>Offline</h2>
        {caches !== null &&
          (caches.length > 0 ? (
            <ul {...stylex.props(styles.list)}>
              {caches.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          ) : (
            <p {...stylex.props(styles.text)}>No offline cache.</p>
          ))}
        <Button
          label="Check for update"
          variant="secondary"
          onClick={() => {
            void worker
              .update()
              .then((result) =>
                toast(
                  result === 'checked'
                    ? 'Checked for an update.'
                    : 'No offline worker is registered.',
                ),
              )
              .catch(() => toast("Couldn't check for an update."));
          }}
        />
        <Button
          label="Unregister and reload"
          variant="secondary"
          onClick={() => {
            // A rejection skips the reload, so the menu stays up to say what failed.
            void worker
              .unregister()
              .then(() => worker.reload())
              .catch(() => toast("Couldn't unregister the offline worker."));
          }}
        />
      </section>

      <Button
        label="Lock developer mode"
        onClick={() => {
          lock();
          toast('Developer mode off');
          void navigate('/');
        }}
      />

      {clearing && (
        <ClearOutfits
          count={outfits.length}
          onConfirm={() => void clearOutfits()}
          onClose={() => setClearing(false)}
        />
      )}
    </Screen>
  );
}
