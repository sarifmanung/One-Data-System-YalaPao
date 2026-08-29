import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTHORIZATION_DELEGATED_APPROVER_MANAGE,
  EMPLOYEE_MASTER_DATA_SYNC,
  EMPLOYEE_PROFILE_READ,
  LEAVE_PAPER_DECISION_RECORD,
  LEAVE_REQUEST_CREATE,
  LEAVE_REQUEST_READ,
} from '@onedata/contracts';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './permission.decorator';
import {
  hasOneDataPermission,
  permissionsFromPortalClaims,
  scopeForPermission,
} from './permissions';

describe('One Data permission policy', () => {
  it('maps Portal role and position grants without trusting unknown codes', () => {
    const permissions = permissionsFromPortalClaims({
      roles: ['pcu_staff'],
      positions: ['pcu_public_health_officer', 'unknown_position'],
    });

    expect(permissions).toEqual(expect.arrayContaining([
      'dashboard.view',
      'employee.profile.read',
      'leave.request.create',
      'leave.request.submit',
    ]));
    expect(permissions).not.toContain(EMPLOYEE_MASTER_DATA_SYNC);
    expect(permissions).not.toContain(LEAVE_PAPER_DECISION_RECORD);
    expect(permissionsFromPortalClaims({ roles: ['unknown_role'], positions: ['unknown_position'] }))
      .toEqual([]);
  });

  it('grants paper-result recording to the manager position', () => {
    const permissions = permissionsFromPortalClaims({ positions: ['pcu_director'] });
    expect(permissions).toContain(LEAVE_PAPER_DECISION_RECORD);
    expect(hasOneDataPermission({ permissions }, LEAVE_PAPER_DECISION_RECORD)).toBe(true);
  });

  it('applies self, tenant and affiliation scopes from capabilities', () => {
    expect(scopeForPermission({ permissions: ['leave.request.create', 'leave.request.read'] }, LEAVE_REQUEST_READ))
      .toBe('self');
    expect(scopeForPermission({ permissions: [LEAVE_PAPER_DECISION_RECORD, LEAVE_REQUEST_READ] }, LEAVE_REQUEST_READ))
      .toBe('tenant');
    expect(scopeForPermission({ permissions: [EMPLOYEE_MASTER_DATA_SYNC, EMPLOYEE_PROFILE_READ, LEAVE_REQUEST_READ] }, LEAVE_REQUEST_READ))
      .toBe('affiliation');
    expect(scopeForPermission({ permissions: [AUTHORIZATION_DELEGATED_APPROVER_MANAGE] }, AUTHORIZATION_DELEGATED_APPROVER_MANAGE))
      .toBe('affiliation');
  });

  it('denies a protected route when the capability is absent', () => {
    class TestController {
      public protectedRoute(): void {}
    }
    RequirePermission(EMPLOYEE_MASTER_DATA_SYNC)(
      TestController.prototype,
      'protectedRoute',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'protectedRoute')!,
    );

    const reflector = new Reflector();
    const guard = new PermissionGuard(reflector);
    const context = {
      getHandler: () => TestController.prototype.protectedRoute,
      getClass: () => TestController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { permissions: ['employee.profile.read'] },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
