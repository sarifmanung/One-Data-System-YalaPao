-- One Data target baseline for a new database.
-- Existing databases must be baselined after a reviewed count/hash check;
-- never run this migration blindly against an existing application database.

-- CreateTable
CREATE TABLE `Affiliation` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `sourceSystem` VARCHAR(64) NULL,
    `sourceId` VARCHAR(128) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Affiliation_code_key`(`code`),
    UNIQUE INDEX `Affiliation_sourceSystem_sourceId_key`(`sourceSystem`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tenant` (
    `id` VARCHAR(36) NOT NULL,
    `affiliationId` VARCHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `sourceSystem` VARCHAR(64) NULL,
    `sourceId` VARCHAR(128) NULL,
    `areaKey` VARCHAR(64) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tenant_affiliationId_status_idx`(`affiliationId`, `status`),
    UNIQUE INDEX `Tenant_affiliationId_code_key`(`affiliationId`, `code`),
    UNIQUE INDEX `Tenant_sourceSystem_sourceId_key`(`sourceSystem`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Person` (
    `id` VARCHAR(36) NOT NULL,
    `firstName` VARCHAR(150) NOT NULL,
    `lastName` VARCHAR(150) NOT NULL,
    `prefix` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Employee` (
    `id` VARCHAR(36) NOT NULL,
    `personId` VARCHAR(36) NOT NULL,
    `sourceSystem` VARCHAR(64) NULL,
    `sourceId` VARCHAR(128) NULL,
    `positionGroup` VARCHAR(100) NULL,
    `positionName` VARCHAR(150) NULL,
    `startDate` DATE NULL,
    `governmentServiceStartDate` DATE NULL,
    `healthCenterStartDate` DATE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sourceUpdatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Employee_personId_idx`(`personId`),
    INDEX `Employee_isActive_idx`(`isActive`),
    UNIQUE INDEX `Employee_sourceSystem_sourceId_key`(`sourceSystem`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeRevision` (
    `id` VARCHAR(36) NOT NULL,
    `employeeId` VARCHAR(36) NOT NULL,
    `revision` INTEGER NOT NULL,
    `changeType` VARCHAR(32) NOT NULL,
    `effectiveAt` DATETIME(3) NULL,
    `payload` JSON NOT NULL,
    `createdBy` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmployeeRevision_employeeId_effectiveAt_idx`(`employeeId`, `effectiveAt`),
    UNIQUE INDEX `EmployeeRevision_employeeId_revision_key`(`employeeId`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmploymentMembership` (
    `id` VARCHAR(36) NOT NULL,
    `employeeId` VARCHAR(36) NOT NULL,
    `affiliationId` VARCHAR(36) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `membershipType` VARCHAR(32) NOT NULL DEFAULT 'PRIMARY',
    `isPrimary` BOOLEAN NOT NULL DEFAULT true,
    `effectiveFrom` DATE NOT NULL,
    `effectiveTo` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EmploymentMembership_employeeId_effectiveFrom_effectiveTo_idx`(`employeeId`, `effectiveFrom`, `effectiveTo`),
    INDEX `EmploymentMembership_tenantId_effectiveFrom_effectiveTo_idx`(`tenantId`, `effectiveFrom`, `effectiveTo`),
    INDEX `EmploymentMembership_affiliationId_effectiveFrom_effectiveTo_idx`(`affiliationId`, `effectiveFrom`, `effectiveTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalIdentityMapping` (
    `id` VARCHAR(36) NOT NULL,
    `externalSystem` VARCHAR(64) NOT NULL,
    `externalSubject` VARCHAR(255) NOT NULL,
    `personId` VARCHAR(36) NULL,
    `employeeId` VARCHAR(36) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExternalIdentityMapping_personId_idx`(`personId`),
    INDEX `ExternalIdentityMapping_employeeId_idx`(`employeeId`),
    UNIQUE INDEX `ExternalIdentityMapping_externalSystem_externalSubject_key`(`externalSystem`, `externalSubject`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthSession` (
    `id` VARCHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `externalSystem` VARCHAR(64) NOT NULL,
    `externalSubject` VARCHAR(255) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `displayName` VARCHAR(255) NOT NULL,
    `roles` JSON NOT NULL,
    `permissions` JSON NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AuthSession_tokenHash_key`(`tokenHash`),
    INDEX `AuthSession_externalSystem_externalSubject_revokedAt_idx`(`externalSystem`, `externalSubject`, `revokedAt`),
    INDEX `AuthSession_expiresAt_revokedAt_idx`(`expiresAt`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterDataSyncRun` (
    `id` VARCHAR(36) NOT NULL,
    `sourceSystem` VARCHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `initiatedBy` VARCHAR(128) NULL,
    `sourceStartedAt` DATETIME(3) NULL,
    `sourceCompletedAt` DATETIME(3) NULL,
    `healthCentersFetched` INTEGER NOT NULL DEFAULT 0,
    `employeesFetched` INTEGER NOT NULL DEFAULT 0,
    `usersFetched` INTEGER NOT NULL DEFAULT 0,
    `usersWithEmployeeMapping` INTEGER NOT NULL DEFAULT 0,
    `tenantsUpserted` INTEGER NOT NULL DEFAULT 0,
    `employeesUpserted` INTEGER NOT NULL DEFAULT 0,
    `employeesDeactivated` INTEGER NOT NULL DEFAULT 0,
    `membershipsCreated` INTEGER NOT NULL DEFAULT 0,
    `membershipsClosed` INTEGER NOT NULL DEFAULT 0,
    `errorCode` VARCHAR(64) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `MasterDataSyncRun_sourceSystem_createdAt_idx`(`sourceSystem`, `createdAt`),
    INDEX `MasterDataSyncRun_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveType` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LeaveType_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeavePolicyProfile` (
    `id` VARCHAR(36) NOT NULL,
    `affiliationId` VARCHAR(36) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `employeeTypeScope` VARCHAR(100) NOT NULL,
    `legalBasis` VARCHAR(255) NULL,
    `effectiveFrom` DATE NOT NULL,
    `effectiveTo` DATE NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeavePolicyProfile_affiliationId_status_effectiveFrom_idx`(`affiliationId`, `status`, `effectiveFrom`),
    UNIQUE INDEX `LeavePolicyProfile_affiliationId_code_effectiveFrom_key`(`affiliationId`, `code`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Holiday` (
    `id` VARCHAR(36) NOT NULL,
    `affiliationId` VARCHAR(36) NOT NULL,
    `holidayDate` DATE NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Holiday_holidayDate_idx`(`holidayDate`),
    UNIQUE INDEX `Holiday_affiliationId_holidayDate_key`(`affiliationId`, `holidayDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveRequest` (
    `id` VARCHAR(36) NOT NULL,
    `tenantId` VARCHAR(36) NOT NULL,
    `employeeId` VARCHAR(36) NOT NULL,
    `leaveTypeId` VARCHAR(36) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    `startsOn` DATE NOT NULL,
    `endsOn` DATE NOT NULL,
    `requestedDays` DECIMAL(8, 2) NULL,
    `calculationBasis` VARCHAR(64) NULL,
    `approvedDays` DECIMAL(8, 2) NULL,
    `reason` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `effectiveAt` DATETIME(3) NULL,
    `voidedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeaveRequest_tenantId_status_startsOn_idx`(`tenantId`, `status`, `startsOn`),
    INDEX `LeaveRequest_employeeId_startsOn_endsOn_idx`(`employeeId`, `startsOn`, `endsOn`),
    INDEX `LeaveRequest_leaveTypeId_status_idx`(`leaveTypeId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveExportBatch` (
    `id` VARCHAR(36) NOT NULL,
    `affiliationId` VARCHAR(36) NOT NULL,
    `period` CHAR(7) NOT NULL,
    `periodYear` INTEGER NOT NULL,
    `periodMonth` INTEGER NOT NULL,
    `snapshotVersion` INTEGER NOT NULL,
    `contractVersion` VARCHAR(16) NOT NULL,
    `sourceCutoff` DATETIME(3) NOT NULL,
    `sourceHash` CHAR(64) NOT NULL,
    `idempotencyKey` VARCHAR(255) NOT NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PREPARED',
    `processedEmployees` INTEGER NOT NULL DEFAULT 0,
    `processedLeaveEntries` INTEGER NOT NULL DEFAULT 0,
    `lastError` TEXT NULL,
    `createdBy` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LeaveExportBatch_idempotencyKey_key`(`idempotencyKey`),
    INDEX `LeaveExportBatch_affiliationId_period_status_idx`(`affiliationId`, `period`, `status`),
    UNIQUE INDEX `LeaveExportBatch_affiliationId_period_snapshotVersion_key`(`affiliationId`, `period`, `snapshotVersion`),
    UNIQUE INDEX `LeaveExportBatch_affiliationId_period_sourceHash_key`(`affiliationId`, `period`, `sourceHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveExportDelivery` (
    `id` VARCHAR(36) NOT NULL,
    `batchId` VARCHAR(36) NOT NULL,
    `attempt` INTEGER NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `httpStatus` INTEGER NULL,
    `retryable` BOOLEAN NOT NULL DEFAULT false,
    `nextAttemptAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `response` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeaveExportDelivery_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    INDEX `LeaveExportDelivery_batchId_createdAt_idx`(`batchId`, `createdAt`),
    UNIQUE INDEX `LeaveExportDelivery_batchId_attempt_key`(`batchId`, `attempt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveRequestRevision` (
    `id` VARCHAR(36) NOT NULL,
    `leaveRequestId` VARCHAR(36) NOT NULL,
    `revision` INTEGER NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `payload` JSON NOT NULL,
    `createdBy` VARCHAR(128) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeaveRequestRevision_leaveRequestId_createdAt_idx`(`leaveRequestId`, `createdAt`),
    UNIQUE INDEX `LeaveRequestRevision_leaveRequestId_revision_key`(`leaveRequestId`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeavePaperResult` (
    `id` VARCHAR(36) NOT NULL,
    `leaveRequestId` VARCHAR(36) NOT NULL,
    `result` VARCHAR(32) NOT NULL,
    `approvedDays` DECIMAL(8, 2) NULL,
    `documentNumber` VARCHAR(100) NULL,
    `documentDate` DATE NULL,
    `reason` TEXT NULL,
    `recordedBy` VARCHAR(128) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeavePaperResult_leaveRequestId_recordedAt_idx`(`leaveRequestId`, `recordedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveQuotaLedger` (
    `id` VARCHAR(36) NOT NULL,
    `employeeId` VARCHAR(36) NOT NULL,
    `leaveRequestId` VARCHAR(36) NULL,
    `leaveTypeId` VARCHAR(36) NOT NULL,
    `fiscalYear` INTEGER NOT NULL,
    `deltaDays` DECIMAL(8, 2) NOT NULL,
    `reason` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LeaveQuotaLedger_employeeId_leaveTypeId_fiscalYear_idx`(`employeeId`, `leaveTypeId`, `fiscalYear`),
    INDEX `LeaveQuotaLedger_leaveRequestId_idx`(`leaveRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditEvent` (
    `id` VARCHAR(36) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `actorId` VARCHAR(128) NULL,
    `resourceType` VARCHAR(100) NOT NULL,
    `resourceId` VARCHAR(128) NULL,
    `tenantId` VARCHAR(36) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditEvent_resourceType_resourceId_createdAt_idx`(`resourceType`, `resourceId`, `createdAt`),
    INDEX `AuditEvent_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    INDEX `AuditEvent_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutboxEvent` (
    `id` VARCHAR(36) NOT NULL,
    `eventType` VARCHAR(100) NOT NULL,
    `aggregateType` VARCHAR(100) NOT NULL,
    `aggregateId` VARCHAR(128) NOT NULL,
    `leaveRequestId` VARCHAR(191) NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `availableAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OutboxEvent_status_availableAt_idx`(`status`, `availableAt`),
    INDEX `OutboxEvent_aggregateType_aggregateId_idx`(`aggregateType`, `aggregateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Tenant` ADD CONSTRAINT `Tenant_affiliationId_fkey` FOREIGN KEY (`affiliationId`) REFERENCES `Affiliation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Employee` ADD CONSTRAINT `Employee_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeRevision` ADD CONSTRAINT `EmployeeRevision_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmploymentMembership` ADD CONSTRAINT `EmploymentMembership_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmploymentMembership` ADD CONSTRAINT `EmploymentMembership_affiliationId_fkey` FOREIGN KEY (`affiliationId`) REFERENCES `Affiliation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmploymentMembership` ADD CONSTRAINT `EmploymentMembership_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalIdentityMapping` ADD CONSTRAINT `ExternalIdentityMapping_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalIdentityMapping` ADD CONSTRAINT `ExternalIdentityMapping_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeavePolicyProfile` ADD CONSTRAINT `LeavePolicyProfile_affiliationId_fkey` FOREIGN KEY (`affiliationId`) REFERENCES `Affiliation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Holiday` ADD CONSTRAINT `Holiday_affiliationId_fkey` FOREIGN KEY (`affiliationId`) REFERENCES `Affiliation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `Employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveExportBatch` ADD CONSTRAINT `LeaveExportBatch_affiliationId_fkey` FOREIGN KEY (`affiliationId`) REFERENCES `Affiliation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveExportDelivery` ADD CONSTRAINT `LeaveExportDelivery_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `LeaveExportBatch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequestRevision` ADD CONSTRAINT `LeaveRequestRevision_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `LeaveRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeavePaperResult` ADD CONSTRAINT `LeavePaperResult_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `LeaveRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveQuotaLedger` ADD CONSTRAINT `LeaveQuotaLedger_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `LeaveRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutboxEvent` ADD CONSTRAINT `OutboxEvent_leaveRequestId_fkey` FOREIGN KEY (`leaveRequestId`) REFERENCES `LeaveRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
