import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  EMPLOYEE_MASTER_DATA_SYNC,
  LEAVE_PAPER_DECISION_RECORD,
} from '@onedata/contracts';
import { PermissionGuard } from './permission.guard';
import { RequirePermission } from './permission.decorator';
import {
  hasOneDataPermission,
  permissionsFromPortalClaims,
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
