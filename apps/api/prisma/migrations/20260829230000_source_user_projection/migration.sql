-- CreateTable
CREATE TABLE `SourceUserProjection` (
    `id` VARCHAR(36) NOT NULL,
    `sourceSystem` VARCHAR(64) NOT NULL,
    `sourceId` VARCHAR(128) NOT NULL,
    `username` VARCHAR(255) NOT NULL,
    `role` VARCHAR(100) NOT NULL,
    `healthCenterSourceId` VARCHAR(128) NULL,
    `sourceEmployeeId` VARCHAR(128) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastSeenAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SourceUserProjection_sourceSystem_username_idx`(`sourceSystem`, `username`),
    INDEX `SourceUserProjection_sourceSystem_isActive_idx`(`sourceSystem`, `isActive`),
    INDEX `SourceUserProjection_healthCenterSourceId_idx`(`healthCenterSourceId`),
    UNIQUE INDEX `SourceUserProjection_sourceSystem_sourceId_key`(`sourceSystem`, `sourceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
