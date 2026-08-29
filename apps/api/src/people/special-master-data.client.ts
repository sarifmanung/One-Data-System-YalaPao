import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const SPECIAL_ALLOWANCES_SOURCE_SYSTEM = 'special-allowances';

export interface SpecialHealthCenter {
  id: string;
  name: string;
  areaKey: string;
}

export interface SpecialEmployee {
  id: string;
  firstName: string;
  lastName: string;
  positionGroup: string;
  effectivePositionGroup: string | null;
  positionName: string | null;
  startDate: Date | null;
  governmentServiceStartDate: Date | null;
  healthCenterStartDate: Date | null;
  healthCenterId: string;
  isActive: boolean;
  updatedAt: Date | null;
}

export interface SpecialUser {
  id: string;
  username: string;
  role: string;
  healthCenterId: string | null;
  employeeId: string | null;
  isActive: boolean;
}

export interface SpecialMasterDataSnapshot {
  sourceStartedAt: Date;
  sourceCompletedAt: Date;
  healthCenters: SpecialHealthCenter[];
  employees: SpecialEmployee[];
  users: SpecialUser[];
}

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 255) {
    throw new BadGatewayException(`Special master-data field is invalid: ${field}`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return requiredString(value, field);
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new BadGatewayException(`Special master-data date is invalid: ${field}`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadGatewayException(`Special master-data date is invalid: ${field}`);
  }
  return date;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new BadGatewayException(`Special master-data field is invalid: ${field}`);
  }
  return value;
}

function arrayData(value: unknown, endpoint: string): unknown[] {
  if (!isRecord(value) || !Array.isArray(value.data)) {
    throw new BadGatewayException(`Special master-data response is invalid: ${endpoint}`);
  }
  return value.data;
}

@Injectable()
export class SpecialMasterDataClient {
  constructor(private readonly config: ConfigService) {}

  async fetchSnapshot(): Promise<SpecialMasterDataSnapshot> {
    const baseUrl = this.config.get<string>('SPECIAL_ALLOWANCES_BASE_URL')?.trim();
    const integrationToken = this.config.get<string>('SPECIAL_ALLOWANCES_INTEGRATION_TOKEN')?.trim();
    if (!baseUrl || !integrationToken) {
      throw new ServiceUnavailableException('Special-Allowances master-data integration is not configured.');
    }

    const sourceStartedAt = new Date();
    const [healthCentersResponse, employeesResponse, usersResponse] = await Promise.all([
      this.get(baseUrl, integrationToken, '/internal/api/v1/master-data/health-centers'),
      this.get(baseUrl, integrationToken, '/internal/api/v1/master-data/employees'),
      this.get(baseUrl, integrationToken, '/internal/api/v1/master-data/users'),
    ]);

    const sourceCompletedAt = new Date();
    return {
      sourceStartedAt,
      sourceCompletedAt,
      healthCenters: this.parseHealthCenters(
        arrayData(healthCentersResponse, 'health-centers'),
      ),
      employees: this.parseEmployees(
        arrayData(employeesResponse, 'employees'),
      ),
      users: this.parseUsers(arrayData(usersResponse, 'users')),
    };
  }

  private async get(baseUrl: string, token: string, path: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(new URL(path, `${baseUrl.replace(/\/+$/, '')}/`), {
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(this.timeoutMs()),
      });
    } catch {
      throw new BadGatewayException('Special-Allowances master-data endpoint is unreachable.');
    }

    if (!response.ok) {
      throw new BadGatewayException(`Special-Allowances master-data endpoint returned HTTP ${response.status}.`);
    }

    try {
      return await response.json() as unknown;
    } catch {
      throw new BadGatewayException('Special-Allowances master-data response is not valid JSON.');
    }
  }

  private parseHealthCenters(items: unknown[]): SpecialHealthCenter[] {
    return items.map((item, index) => {
      if (!isRecord(item)) {
        throw new BadGatewayException(`Special health center row ${index} is invalid.`);
      }
      return {
        id: requiredString(item.id, `health-centers[${index}].id`),
        name: requiredString(item.name, `health-centers[${index}].name`),
        areaKey: requiredString(item.areaKey, `health-centers[${index}].areaKey`),
      };
    });
  }

  private parseEmployees(items: unknown[]): SpecialEmployee[] {
    return items.map((item, index) => {
      if (!isRecord(item)) {
        throw new BadGatewayException(`Special employee row ${index} is invalid.`);
      }
      return {
        id: requiredString(item.id, `employees[${index}].id`),
        firstName: requiredString(item.firstName, `employees[${index}].firstName`),
        lastName: requiredString(item.lastName, `employees[${index}].lastName`),
        positionGroup: requiredString(item.positionGroup, `employees[${index}].positionGroup`),
        effectivePositionGroup: optionalString(
          item.effectivePositionGroup,
          `employees[${index}].effectivePositionGroup`,
        ),
        positionName: optionalString(item.positionName, `employees[${index}].positionName`),
        startDate: optionalDate(item.startDate, `employees[${index}].startDate`),
        governmentServiceStartDate: optionalDate(
          item.governmentServiceStartDate,
          `employees[${index}].governmentServiceStartDate`,
        ),
        healthCenterStartDate: optionalDate(
          item.healthCenterStartDate,
          `employees[${index}].healthCenterStartDate`,
        ),
        healthCenterId: requiredString(item.healthCenterId, `employees[${index}].healthCenterId`),
        isActive: requiredBoolean(item.isActive, `employees[${index}].isActive`),
        updatedAt: optionalDate(item.updatedAt, `employees[${index}].updatedAt`),
      };
    });
  }

  private parseUsers(items: unknown[]): SpecialUser[] {
    return items.map((item, index) => {
      if (!isRecord(item)) {
        throw new BadGatewayException(`Special user row ${index} is invalid.`);
      }
      return {
        id: requiredString(item.id, `users[${index}].id`),
        username: requiredString(item.username, `users[${index}].username`),
        role: requiredString(item.role, `users[${index}].role`),
        healthCenterId: optionalString(item.healthCenterId, `users[${index}].healthCenterId`),
        employeeId: optionalString(item.employeeId, `users[${index}].employeeId`),
        isActive: requiredBoolean(item.isActive, `users[${index}].isActive`),
      };
    });
  }

  private timeoutMs(): number {
    const configured = Number(this.config.get<string>('SPECIAL_ALLOWANCES_TIMEOUT_MS', '10000'));
    if (!Number.isFinite(configured) || configured < 1_000) {
      return 10_000;
    }
    return Math.min(Math.floor(configured), 60_000);
  }
}
