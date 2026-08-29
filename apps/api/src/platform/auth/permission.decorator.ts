import { SetMetadata } from '@nestjs/common';
import type { OneDataPermission } from '@onedata/contracts';

export const REQUIRED_PERMISSIONS_KEY = 'onedata:required_permissions';

export const RequirePermission = (permission: OneDataPermission) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, [permission]);
