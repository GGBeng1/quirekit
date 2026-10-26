import { describe, expect, it } from 'vitest';
import { getMathCommands, searchMathCommands } from './catalog';
import { moveMathCommand } from './navigation';
import { mathTemplates } from '../templates/catalog';

describe('framework-independent command discovery', () => {
  it('exposes every admitted template and bilingual symbols as immutable stable catalog data', () => {
    const commands = getMathCommands();
    expect(getMathCommands()).toBe(commands);
    expect(Object.isFrozen(commands)).toBe(true);
    for (const template of mathTemplates) expect(commands.find(command => command.value === template.id)).toBeDefined();
    expect(searchMathCommands('积分').some(command => command.value === 'definite-integral')).toBe(true);
    expect(searchMathCommands('alpha').some(command => command.value === 'symbol:α')).toBe(true);
    expect(searchMathCommands('matrix').length).toBeGreaterThan(0);
  });

  it('navigates consumer-measured tile centers including a wide preview', () => {
    const rects = [
      { left: 0, top: 0, width: 30, height: 30 }, { left: 40, top: 0, width: 30, height: 30 },
      { left: 0, top: 40, width: 70, height: 30 }, { left: 80, top: 40, width: 30, height: 30 },
    ];
    expect(moveMathCommand(rects, 1, 'ArrowDown')).toBe(2);
    expect(moveMathCommand(rects, 2, 'ArrowRight')).toBe(3);
  });
});
