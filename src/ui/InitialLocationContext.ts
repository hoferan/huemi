import { createContext } from 'react';

/**
 * True while the router is still showing the location the app arrived on.
 *
 * The default is false, so a `Screen` rendered with no `InitialLocation`
 * above it moves focus on arrival. That is the wrong behaviour, and it is
 * the one a test catches; defaulting the other way would switch the focus
 * move off everywhere and say nothing.
 */
export const InitialLocationContext = createContext(false);
