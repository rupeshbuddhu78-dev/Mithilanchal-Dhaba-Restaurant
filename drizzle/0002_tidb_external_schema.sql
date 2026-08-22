-- Non-destructive completion migration for the temporary TiDB Cloud `test` schema.
-- The existing production-catalog tables are deliberately left unchanged.

CREATE TABLE IF NOT EXISTS `addresses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `label` varchar(80) NOT NULL,
  `recipientName` varchar(160) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `line1` text NOT NULL,
  `line2` text,
  `city` varchar(120) NOT NULL,
  `state` varchar(120) NOT NULL,
  `pincode` varchar(20) NOT NULL,
  `deliveryInstructions` text,
  `isDefault` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `addresses_user_idx` (`userId`)
);

CREATE TABLE IF NOT EXISTS `carts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `carts_user_unique` (`userId`)
);

CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cartId` int NOT NULL,
  `menuItemId` int NOT NULL,
  `quantity` int NOT NULL,
  `selectedOptions` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cart_items_cart_idx` (`cartId`),
  KEY `cart_items_menu_idx` (`menuItemId`)
);

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` varchar(80) NOT NULL,
  `title` varchar(180) NOT NULL,
  `body` text NOT NULL,
  `orderId` int,
  `isRead` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notifications_user_idx` (`userId`)
);

CREATE TABLE IF NOT EXISTS `coupons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `description` text,
  `discountType` enum('fixed','percent') NOT NULL,
  `discountValue` int NOT NULL,
  `minimumOrderPaise` int NOT NULL DEFAULT 0,
  `isActive` boolean NOT NULL DEFAULT true,
  `startsAt` timestamp NULL,
  `endsAt` timestamp NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupons_code_unique` (`code`)
);

CREATE TABLE IF NOT EXISTS `audit_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actorUserId` int,
  `action` varchar(120) NOT NULL,
  `resourceType` varchar(80) NOT NULL,
  `resourceId` varchar(80),
  `metadata` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
