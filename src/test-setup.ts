import '@testing-library/jest-dom/vitest';

// jsdom has no layout, so it does not implement scrolling and logs an error
// for every call. `Screen` scrolls to the top on each forward navigation,
// which would bury real output under that noise. `Screen.test.tsx` spies on
// this to check the calls. The setup also runs for the Node-environment
// suites under `pwa/`, which have no window.
if (typeof window !== 'undefined') window.scrollTo = () => {};
