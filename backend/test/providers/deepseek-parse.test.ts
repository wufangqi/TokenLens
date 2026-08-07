import { describe, it, expect } from 'vitest';
import { parseDeepSeekBalance } from '../../src/providers/deepseek-parse';

describe('parseDeepSeekBalance', () => {
  it('prefers CNY balance_infos entry', () => {
    const out = parseDeepSeekBalance(
      {
        is_available: true,
        balance_infos: [
          {
            currency: 'USD',
            total_balance: '1.00',
            granted_balance: '0',
            topped_up_balance: '1.00',
          },
          {
            currency: 'CNY',
            total_balance: '37.01',
            granted_balance: '10.00',
            topped_up_balance: '27.01',
          },
        ],
      },
      3,
    );
    expect(out.currency).toBe('CNY');
    expect(out.balanceAmount).toBeCloseTo(37.01);
    expect(out.grantedBalance).toBeCloseTo(10);
    expect(out.toppedUpBalance).toBeCloseTo(27.01);
    expect(out.generation).toBe(3);
    expect(out.totalCredits).toBe(0);
  });

  it('falls back to first entry when no CNY', () => {
    const out = parseDeepSeekBalance(
      {
        balance_infos: [{ currency: 'USD', total_balance: '12.5', granted_balance: '0', topped_up_balance: '12.5' }],
      },
      1,
    );
    expect(out.currency).toBe('USD');
    expect(out.balanceAmount).toBeCloseTo(12.5);
  });

  it('returns zeros when balance_infos missing', () => {
    const out = parseDeepSeekBalance({}, 1);
    expect(out.balanceAmount).toBe(0);
    expect(out.currency).toBe('CNY');
  });
});
