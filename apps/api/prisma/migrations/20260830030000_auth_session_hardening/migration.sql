-- Durable Portal launch-token replay protection and session revocation metadata.
-- The unique jti key makes consumption atomic across API replicas.

ALTER TABLE `AuthSession`
    ADD COLUMN `revokedReason` VARCHAR(64) NULL;

CREATE TABLE `PortalLaunchReplay` (
    `jti` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PortalLaunchReplay_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`jti`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
