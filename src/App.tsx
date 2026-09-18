import * as stylex from '@stylexjs/stylex';
import { tokens } from './styles/tokens.stylex';

const styles = stylex.create({
  page: {
    backgroundColor: tokens.bg,
    fontFamily: tokens.fontBody,
    // Screen already gives the page its 100dvh and its padding. Asking for
    // another viewport height here adds the padding on top of it and leaves
    // the route with 74px of nothing to scroll through, so this fills what
    // the wrapper hands it instead.
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
  },
  // Dynamic style: this is the pattern the whole app depends on.
  block: (background: string) => ({
    backgroundColor: background,
    borderRadius: tokens.radius,
    flex: '1',
    minHeight: tokens.touchTarget,
  }),
});

const SPIKE = [
  { name: 'Navy', hex: '#1f2a44' },
  { name: 'Cream', hex: '#e9dfc9' },
];

export default function App() {
  return (
    <div {...stylex.props(styles.page)}>
      {SPIKE.map((c) => (
        <div key={c.hex} role="img" aria-label={c.name} {...stylex.props(styles.block(c.hex))} />
      ))}
    </div>
  );
}
