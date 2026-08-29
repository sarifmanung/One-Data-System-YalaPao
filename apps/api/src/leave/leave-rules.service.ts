import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type LeaveCountingMode = 'WORKING_DAYS' | 'CALENDAR_DAYS';

export interface LeaveCalculation {
  requestedDays: string;
  countingMode: LeaveCountingMode;
  calculationBasis: string;
}

const PROVISIONAL_RULEBOOK_VERSION = 'PROVISIONAL_RULEBOOK_V1';

/**
 * These are only the three leave types seeded for the first development slice.
 * A leave type without an explicit rule is rejected until HR publishes a
 * versioned rulebook entry; it must not silently fall back to a guessed rule.
 */
const COUNTING_RULES: Readonly<Record<string, LeaveCountingMode>> = {
  ANNUAL: 'WORKING_DAYS',
  PERSONAL: 'WORKING_DAYS',
  SICK: 'WORKING_DAYS',
  VACATION_LEAVE: 'WORKING_DAYS',
  PERSONAL_LEAVE: 'WORKING_DAYS',
  SICK_LEAVE: 'WORKING_DAYS',
  MATERNITY_LEAVE: 'CALENDAR_DAYS',
  HAJJ_LEAVE: 'CALENDAR_DAYS',
  ORDAIN_LEAVE: 'CALENDAR_DAYS',
};

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function nextDate(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + 1));
}

export function countingModeForLeaveType(code: string): LeaveCountingMode | null {
  return COUNTING_RULES[code] ?? null;
}

export function countLeaveDays(
  startsOn: Date,
  endsOn: Date,
  countingMode: LeaveCountingMode,
  holidayDates: ReadonlySet<string> = new Set(),
): number {
  if (endsOn < startsOn) {
    throw new BadRequestException('The leave end date must not be before the start date.');
  }

  let countedDays = 0;
  for (let cursor = new Date(startsOn); cursor <= endsOn; cursor = nextDate(cursor)) {
    const dayOfWeek = cursor.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayDates.has(isoDate(cursor));

    if (countingMode === 'CALENDAR_DAYS' || (!isWeekend && !isHoliday)) {
      countedDays += 1;
    }
  }

  return countedDays;
}

@Injectable()
export class LeaveRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(
    leaveTypeCode: string,
    affiliationId: string,
    startsOn: Date,
    endsOn: Date,
  ): Promise<LeaveCalculation> {
    const countingMode = countingModeForLeaveType(leaveTypeCode);
    if (!countingMode) {
      throw new BadRequestException(
        'The selected leave type has no approved counting rule yet.',
      );
    }

    const holidays = countingMode === 'WORKING_DAYS'
      ? await this.prisma.holiday.findMany({
          where: {
            affiliationId,
            holidayDate: { gte: startsOn, lte: endsOn },
          },
          select: { holidayDate: true },
        })
      : [];
    const holidayDates = new Set(holidays.map((holiday) => isoDate(holiday.holidayDate)));
    const requestedDays = countLeaveDays(startsOn, endsOn, countingMode, holidayDates);

    if (requestedDays < 1) {
      throw new BadRequestException(
        'The selected leave range has no countable working day.',
      );
    }

    return {
      requestedDays: requestedDays.toFixed(2),
      countingMode,
      calculationBasis: `${PROVISIONAL_RULEBOOK_VERSION}:${countingMode}`,
    };
  }
}
