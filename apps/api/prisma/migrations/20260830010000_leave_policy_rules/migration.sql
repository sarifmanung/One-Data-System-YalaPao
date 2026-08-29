-- AlterTable
ALTER TABLE `LeavePolicyProfile`
    ADD COLUMN `approvedBy` VARCHAR(128) NULL,
    ADD COLUMN `approvedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `LeavePolicyRule` (
    `id` VARCHAR(36) NOT NULL,
    `policyProfileId` VARCHAR(36) NOT NULL,
    `leaveTypeId` VARCHAR(36) NOT NULL,
    `countingMode` VARCHAR(32) NOT NULL,
    `halfDayAllowed` BOOLEAN NOT NULL DEFAULT false,
    `entitlementDays` DECIMAL(8, 2) NULL,
    `entitlementPeriod` VARCHAR(32) NULL,
    `carryOverAllowed` BOOLEAN NOT NULL DEFAULT false,
    `maxCarryOverDays` DECIMAL(8, 2) NULL,
    `requiresSupportingDocument` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LeavePolicyRule_leaveTypeId_countingMode_idx`(`leaveTypeId`, `countingMode`),
    UNIQUE INDEX `LeavePolicyRule_policyProfileId_leaveTypeId_key`(`policyProfileId`, `leaveTypeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LeavePolicyRule` ADD CONSTRAINT `LeavePolicyRule_policyProfileId_fkey` FOREIGN KEY (`policyProfileId`) REFERENCES `LeavePolicyProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeavePolicyRule` ADD CONSTRAINT `LeavePolicyRule_leaveTypeId_fkey` FOREIGN KEY (`leaveTypeId`) REFERENCES `LeaveType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
