import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Checks on the style lessons (/forage-brand): every ingredient's lessons record is sorted into
 * the four lenses the user asked for, the guide keeps its pre-check list, and no em dash slips
 * into any of it (a project rule for every word we write).
 */

const LESSONS = 'docs/ingredients/lessons';
const GUIDE = 'docs/ingredients/forage-ingredient/SKILL.md';
const SKILL = '.claude/skills/forage-brand/SKILL.md';
const LENSES = ['## Colour', '## Composition', '## Form', '## Recurring errors'];

/** Every ingredient's lessons record (not the template or the pending Figma list). */
function records(): string[] {
  if (!existsSync(LESSONS)) return [];
  return readdirSync(LESSONS)
    .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'figma-pending.md')
    .map((f) => join(LESSONS, f));
}

describe('style lessons', () => {
  it('every lessons record has the four lens headings in order', () => {
    for (const file of records()) {
      const text = readFileSync(file, 'utf8');
      const at = LENSES.map((heading) => text.split('\n').findIndex((line) => line.trim() === heading));
      expect(at.every((i) => i >= 0), `${file} is missing a lens heading`).toBe(true);
      expect([...at].sort((a, b) => a - b), `${file} has its lenses out of order`).toEqual(at);
    }
  });

  it('no em dashes in the lessons, the guide or the skill', () => {
    for (const file of [...records(), join(LESSONS, 'README.md'), GUIDE, SKILL]) {
      expect(existsSync(file), `${file} should exist`).toBe(true);
      expect(readFileSync(file, 'utf8').includes('—'), `${file} has an em dash`).toBe(false);
    }
  });

  it('the guide has a pre-check section', () => {
    expect(readFileSync(GUIDE, 'utf8')).toContain('## Pre-check before showing an ingredient');
  });
});
