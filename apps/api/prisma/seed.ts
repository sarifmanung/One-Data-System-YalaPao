import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const affiliation = await prisma.affiliation.upsert({
    where: { id: 'affiliation-dev' },
    update: { code: 'DEV-AFFILIATION', name: 'One Data Development Affiliation' },
    create: {
      id: 'affiliation-dev',
      code: 'DEV-AFFILIATION',
      name: 'One Data Development Affiliation',
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-dev' },
    update: { affiliationId: affiliation.id, code: 'DEV-TENANT', name: 'Development Health Center' },
    create: {
      id: 'tenant-dev',
      affiliationId: affiliation.id,
      code: 'DEV-TENANT',
      name: 'Development Health Center',
    },
  });

  const person = await prisma.person.upsert({
    where: { id: 'person-dev' },
    update: { firstName: 'ผู้ใช้', lastName: 'ทดสอบ' },
    create: {
      id: 'person-dev',
      firstName: 'ผู้ใช้',
      lastName: 'ทดสอบ',
    },
  });

  const employee = await prisma.employee.upsert({
    where: { id: 'employee-dev' },
    update: {
      personId: person.id,
      sourceSystem: 'seed',
      sourceId: 'employee-dev',
      positionGroup: 'DEVELOPMENT_ONLY',
      positionName: 'Synthetic test employee',
    },
    create: {
      id: 'employee-dev',
      personId: person.id,
      sourceSystem: 'seed',
      sourceId: 'employee-dev',
      positionGroup: 'DEVELOPMENT_ONLY',
      positionName: 'Synthetic test employee',
    },
  });

  await prisma.employmentMembership.upsert({
    where: { id: 'membership-dev' },
    update: {
      employeeId: employee.id,
      affiliationId: affiliation.id,
      tenantId: tenant.id,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
    create: {
      id: 'membership-dev',
      employeeId: employee.id,
      affiliationId: affiliation.id,
      tenantId: tenant.id,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    },
  });

  await prisma.externalIdentityMapping.upsert({
    where: {
      externalSystem_externalSubject: {
        externalSystem: 'yala-pao-public-health-portal',
        externalSubject: 'dev-user',
      },
    },
    update: { personId: person.id, employeeId: employee.id, isActive: true },
    create: {
      id: 'identity-dev',
      externalSystem: 'yala-pao-public-health-portal',
      externalSubject: 'dev-user',
      personId: person.id,
      employeeId: employee.id,
    },
  });

  for (const leaveType of [
    { id: 'leave-type-annual', code: 'ANNUAL', name: 'ลาพักผ่อน' },
    { id: 'leave-type-sick', code: 'SICK', name: 'ลาป่วย' },
    { id: 'leave-type-personal', code: 'PERSONAL', name: 'ลากิจส่วนตัว' },
  ]) {
    await prisma.leaveType.upsert({
      where: { id: leaveType.id },
      update: { code: leaveType.code, name: leaveType.name, isActive: true },
      create: leaveType,
    });
  }

  await prisma.leavePolicyProfile.upsert({
    where: {
      affiliationId_code_effectiveFrom: {
        affiliationId: affiliation.id,
        code: 'DEVELOPMENT_PENDING_RULEBOOK',
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    },
    update: { status: 'DRAFT' },
    create: {
      id: 'leave-policy-dev',
      affiliationId: affiliation.id,
      code: 'DEVELOPMENT_PENDING_RULEBOOK',
      name: 'Development policy placeholder',
      employeeTypeScope: 'DEVELOPMENT_ONLY',
      legalBasis: 'PENDING_HR_RULEBOOK',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      status: 'DRAFT',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
