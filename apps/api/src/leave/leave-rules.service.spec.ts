import { BadRequestException } from '@nestjs/common';
import {
  countLeaveDays,
  countingModeForLeaveType,
  LeaveRulesService,
} from './leave-rules.service';

function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

describe('LeaveRulesService', () => {
  it('counts working-day leave without weekends or configured holidays', () => {
    const holidays = new Set(['2026-08-12']);

    expect(countLeaveDays(date('2026-08-10'), date('2026-08-16'), 'WORKING_DAYS', holidays))
      .toBe(4);
  });

  it('counts calendar-day leave inclusively', () => {
    expect(countLeaveDays(date('2026-08-14'), date('2026-08-17'), 'CALENDAR_DAYS'))
      .toBe(4);
  });

  it('does not silently invent a rule for an unknown leave type', async () => {
    const service = new LeaveRulesService({ holiday: { findMany: jest.fn() } } as never);

    expect(countingModeForLeaveType('UNKNOWN')).toBeNull();
    await expect(service.calculate(
      'UNKNOWN',
      'affiliation-1',
      date('2026-08-10'),
      date('2026-08-10'),
    )).rejects.toThrow('no approved counting rule');
  });

  it('rejects a range where the end is before the start', () => {
    expect(() => countLeaveDays(
      date('2026-08-17'),
      date('2026-08-14'),
      'CALENDAR_DAYS',
    )).toThrow(BadRequestException);
  });

  it('uses a fixed calculation basis and Decimal-compatible day value', async () => {
    const holiday = { holidayDate: date('2026-08-12') };
    const findMany = jest.fn().mockResolvedValue([holiday]);
    const service = new LeaveRulesService({ holiday: { findMany } } as never);

    await expect(service.calculate(
      'ANNUAL',
      'affiliation-1',
      date('2026-08-10'),
      date('2026-08-14'),
    )).resolves.toEqual({
      requestedDays: '4.00',
      countingMode: 'WORKING_DAYS',
      calculationBasis: 'PROVISIONAL_RULEBOOK_V1:WORKING_DAYS',
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        affiliationId: 'affiliation-1',
        holidayDate: { gte: date('2026-08-10'), lte: date('2026-08-14') },
      },
      select: { holidayDate: true },
    });
  });
});
