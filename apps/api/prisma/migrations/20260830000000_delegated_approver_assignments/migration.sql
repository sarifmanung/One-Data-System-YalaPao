-- CreateTable
CREATE TABLE `DelegatedApproverAssignment` (
    `id` VARCHAR(36) NOT NULL,
    `externalSystem` VARCHAR(64) NOT NULL,
    `externalSubject` VARCHAR(255) NOT NULL,
    `capability` VARCHAR(100) NOT NULL,
    `workspaceKind` VARCHAR(32) NOT NULL,
    `workspaceId` VARCHAR(36) NOT NULL,
    `effectiveFrom` DATE NOT NULL,
    `effectiveTo` DATE NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `reason` TEXT NULL,
    `createdBy` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DelegatedApproverAssignment_externalSystem_externalSubject_capability_isActive_idx`(`externalSystem`, `externalSubject`, `capability`, `isActive`),
    INDEX `DelegatedApproverAssignment_workspaceKind_workspaceId_capability_isActive_idx`(`workspaceKind`, `workspaceId`, `capability`, `isActive`),
    INDEX `DelegatedApproverAssignment_effectiveFrom_effectiveTo_idx`(`effectiveFrom`, `effectiveTo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
