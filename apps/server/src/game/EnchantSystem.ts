import { ENCHANT_TABLE, applyBlessedEnchant } from 'shared';

export type EnchantOutcome = 'success' | 'fail_demote' | 'destroyed';

/** Roll an enchant attempt. */
export function attemptEnchant(currentLevel: number, useBlessed: boolean): { outcome: EnchantOutcome; newLevel: number } {
  const targetLevel = currentLevel + 1;
  if (targetLevel > 9) return { outcome: 'success', newLevel: 9 };
  let probs = ENCHANT_TABLE[targetLevel] ?? { success: 1, fail_demote: 0, destroy: 0 };
  if (useBlessed) probs = applyBlessedEnchant(probs);

  const r = Math.random();
  if (r < probs.success) {
    return { outcome: 'success', newLevel: targetLevel };
  }
  if (r < probs.success + probs.fail_demote) {
    return { outcome: 'fail_demote', newLevel: Math.max(0, currentLevel - 1) };
  }
  return { outcome: 'destroyed', newLevel: 0 };
}
