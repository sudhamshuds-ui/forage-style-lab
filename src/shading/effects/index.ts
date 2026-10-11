import type { ShaderEffect } from '../effect';
import { toonBands } from './toonBands';
import { ambientBounce } from './ambientBounce';
import { highlight } from './highlight';
import { gouacheMatte } from './gouacheMatte';

/**
 * The effect stack, bottom layer first. Like layers in After Effects,
 * order matters: each effect works on the colour the previous one produced.
 *
 * To add a new effect:
 *   1. Copy one of the files in this folder as a starting point.
 *   2. Add any new controls to src/params.ts (Settings, DEFAULTS, SPECS).
 *   3. Add the effect to this list where it belongs in the stack.
 *
 * Tone bands must stay first: it sets `tone`, which later layers read.
 */
export const EFFECT_STACK: ShaderEffect[] = [toonBands, ambientBounce, highlight, gouacheMatte];
