/**
 * Pixels read from the camera or from a chosen photo, RGBA and row-major.
 *
 * The same shape as the DOM's ImageData, declared here instead so the session
 * and the lightness code can hold one without a canvas. jsdom has no canvas,
 * and neither of them needs one.
 */
export type Pixels = { width: number; height: number; data: Uint8ClampedArray };

/** What a capture hands on to the color reading in #20. */
export type Frame = { pixels: Pixels; source: 'camera' | 'photo' };
