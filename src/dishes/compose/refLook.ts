import { FAMILIES, type FamilyId } from '../../ingredients/families';
import { PALETTES } from '../../palettes';
import { hexToOklch, lerpHue, oklchToHex } from '../../utils/colour';
import { REF_COLOURS } from './refColours';

/**
 * Colours from the reference (the user, 2026-11-22: the references are the source of truth for
 * colour too). A sampled colour becomes a whole colour family, the way the pantry's families are
 * built: the sample is the base; the lit side lighter and warmer; the shadow deeper and cooler,
 * turning toward violet (never grey, never the light's hue); a warm glow; a near-white warm
 * highlight. A painted dish then has the reference's colours in the Style Lab's warm light and
 * cool, coloured shadows.
 */
export function familyFrom(hex: string, name: string): { name: string; colours: { lit: string; base: string; shadow: string; glow: string; highlight: string }; rooms: string[] } {
  const { l, c, h } = hexToOklch(hex);
  const hue = Number.isFinite(h) ? h : 60;
  // A touch more colour than the sample (a vibrant watercolour), never past what reads as food.
  const cc = Math.min(0.22, c * 1.15 + 0.01);
  return {
    name,
    colours: {
      // The sample is the painting's average over light and shade: the base a little under it.
      base: oklchToHex(Math.max(0.3, l - 0.05), cc, hue),
      lit: oklchToHex(Math.min(0.95, l + 0.04), cc * 0.95, lerpHue(hue, 70, 0.25)),
      shadow: oklchToHex(Math.max(0.22, l - 0.27), Math.max(0.05, cc * 0.9), lerpHue(hue, 320, 0.4)),
      glow: oklchToHex(Math.min(0.9, l + 0.03), Math.min(0.24, cc * 1.35 + 0.02), lerpHue(hue, 45, 0.3)),
      highlight: oklchToHex(0.97, 0.02, lerpHue(hue, 80, 0.6)),
    },
    rooms: [],
  };
}

/** Register a family for each sampled colour of a dish (`ref:{id}:{role}`); returns role to family. */
export function refFamilies(id: string): Record<string, FamilyId> {
  const ref = REF_COLOURS[id];
  if (!ref) return {};
  const out: Record<string, FamilyId> = {};
  const add = (role: string, hex: string | undefined) => {
    if (!hex) return;
    const key = `ref:${id}:${role}` as FamilyId;
    (FAMILIES as Record<string, unknown>)[key] = familyFrom(hex, `${id} ${role}`);
    out[role] = key;
  };
  for (const [role, hex] of Object.entries(ref.roles)) add(role, hex);
  add('pool', ref.base);
  add('plate', ref.plate);
  return out;
}

/** The dish's own room, from the reference's wall and table (`ref-{id}`). */
export function refRoom(id: string): string | undefined {
  const ref = REF_COLOURS[id];
  if (!ref) return undefined;
  const roomId = `ref-${id}`;
  if (!PALETTES.some((p) => p.id === roomId)) {
    const wall = hexToOklch(ref.wall);
    const table = hexToOklch(ref.table);
    PALETTES.push({
      id: roomId,
      name: `Reference ${id}`,
      family: 'soft',
      colours: {
        wall: ref.wall,
        table: ref.table,
        ambient: oklchToHex(wall.l, wall.c * 1.1, wall.h),
        bounce: '#caa27c',
        castShadow: oklchToHex(Math.max(0.35, table.l - 0.3), Math.max(0.05, table.c + 0.04), lerpHue(Number.isFinite(table.h) ? table.h : 290, 290, 0.6)),
        frame: '#7b7981',
      },
    });
  }
  return roomId;
}
