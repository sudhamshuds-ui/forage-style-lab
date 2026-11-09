import { describe, expect, it } from 'vitest';

/**
 * Checks on the style lessons (/forage-brand): every ingredient's lessons record is sorted into
 * the four lenses the user asked for, the guide keeps its pre-check list, and no em dash slips
 * into any of it (a project rule for every word we write).
 *
 * The files are loaded as text the way Vite loads them (this is a browser project, so the test
 * does not reach for Node's file tools).
 */

const lessons = import.meta.glob('/docs/ingredients/lessons/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const guide = import.meta.glob('/docs/ingredients/forage-ingredient/SKILL.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const skill = import.meta.glob('/.claude/skills/forage-brand/SKILL.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const LENSES = ['## Colour', '## Composition', '## Form', '## Recurring errors'];

/** Every ingredient's lessons record (not the template or the pending Figma list). */
function records(): [string, string][] {
  return Object.entries(lessons).filter(([path]) => !path.endsWith('/README.md') && !path.endsWith('/figma-pending.md'));
}

describe('style lessons', () => {
  it('finds the template, the guide and the skill', () => {
    expect(Object.keys(lessons).some((p) => p.endsWith('/README.md'))).toBe(true);
    expect(Object.keys(guide)).toHaveLength(1);
    expect(Object.keys(skill)).toHaveLength(1);
  });

  it('every lessons record has the four lens headings in order', () => {
    for (const [path, text] of records()) {
      const lines = text.split('\n').map((line) => line.trim());
      const at = LENSES.map((heading) => lines.indexOf(heading));
      expect(at.every((i) => i >= 0), `${path} is missing a lens heading`).toBe(true);
      expect([...at].sort((a, b) => a - b), `${path} has its lenses out of order`).toEqual(at);
    }
  });

  it('no em dashes in the lessons, the guide or the skill', () => {
    for (const [path, text] of [...Object.entries(lessons), ...Object.entries(guide), ...Object.entries(skill)]) {
      expect(text.includes('—'), `${path} has an em dash`).toBe(false);
    }
  });

  it('the guide never teaches what the user rejected: seeds are beads, not flat marks', () => {
    // The watermelon's flat seed stickers were replaced by glossy beads half sunk in (the user, 2026-11-06).
    const text = Object.values(guide)[0];
    expect(text).not.toContain('flat marks (seeds)');
    expect(text).toContain('glossy beads half sunk in');
  });

  it('the guide has a pre-check section', () => {
    expect(Object.values(guide)[0]).toContain('## Pre-check before showing an ingredient');
  });
});
