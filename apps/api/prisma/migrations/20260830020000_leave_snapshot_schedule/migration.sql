-- CreateTable
CREATE TABLE `LeaveSnapshotSchedule` (
    `id` VARCHAR(36) NOT NULL,
    `affiliationId` VARCHAR(36) NOT NULL,
    `mode` VARCHAR(40) NOT NULL DEFAULT 'MONTHLY_PREVIOUS_PERIOD',
    `cutoffDays` INTEGER NOT NULL DEFAULT 3,
    `contractVersion` VARCHAR(16) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    `approvedBy` VARCHAR(128) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LeaveSnapshotSchedule_affiliationId_mode_key`(`affiliationId`, `mode`),
    INDEX `LeaveSnapshotSchedule_status_affiliationId_idx`(`status`, `affiliationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `LeaveSnapshotSchedule` ADD CONSTRAINT `LeaveSnapshotSchedule_affiliationId_fkey` FOREIGN KEY (`affiliationId`) REFERENCES `Affiliation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
