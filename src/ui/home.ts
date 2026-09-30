import type { BackTo } from './Screen';

/**
 * The start screen, as a back arrow's destination. Its title lives here, not
 * in `Entry`, because screens outside `features`, such as `NotFound`, lead
 * back to it too.
 */
export const HOME: BackTo = { to: '/', title: 'Start with a garment' };
