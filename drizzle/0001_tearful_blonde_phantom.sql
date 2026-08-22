CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(120) NOT NULL,
	`resourceType` varchar(80) NOT NULL,
	`resourceId` varchar(80),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cartId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`quantity` int NOT NULL,
	`selectedOptions` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `carts_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(160) NOT NULL,
	`description` text,
	`imageUrl` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`description` text,
	`discountType` enum('fixed','percent') NOT NULL,
	`discountValue` int NOT NULL,
	`minimumOrderPaise` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`startsAt` timestamp,
	`endsAt` timestamp,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(220) NOT NULL,
	`description` text,
	`pricePaise` int NOT NULL,
	`imageUrl` text,
	`isVegetarian` boolean NOT NULL DEFAULT true,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`customisation` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `menu_items_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`orderId` int,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`itemNameSnapshot` varchar(180) NOT NULL,
	`imageUrlSnapshot` text,
	`unitPricePaise` int NOT NULL,
	`quantity` int NOT NULL,
	`selectedOptions` json NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`historyStatus` enum('pending_payment','placed','accepted','preparing','ready_for_pickup','rider_assigned','out_for_delivery','delivered','cancelled') NOT NULL,
	`note` text,
	`actorUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNo` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`orderStatus` enum('pending_payment','placed','accepted','preparing','ready_for_pickup','rider_assigned','out_for_delivery','delivered','cancelled') NOT NULL,
	`paymentMethod` enum('cod','stripe') NOT NULL,
	`paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`stripeCheckoutSessionId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`itemTotalPaise` int NOT NULL,
	`deliveryFeePaise` int NOT NULL,
	`discountPaise` int NOT NULL,
	`grandTotalPaise` int NOT NULL,
	`deliveryAddressSnapshot` json NOT NULL,
	`customerNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNo_unique` UNIQUE(`orderNo`)
);
--> statement-breakpoint
CREATE TABLE `restaurant_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`formattedAddress` text NOT NULL,
	`city` varchar(120),
	`state` varchar(120),
	`country` varchar(120),
	`pincode` varchar(20),
	`latitude` varchar(32),
	`longitude` varchar(32),
	`phone` varchar(30),
	`email` varchar(320),
	`heroHeading` text,
	`heroSubtitle` text,
	`heroImageUrl` text,
	`aboutText` text,
	`logoUrl` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurant_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rider_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`riderUserId` int NOT NULL,
	`assignedByUserId` int NOT NULL,
	`assignedAt` timestamp NOT NULL DEFAULT (now()),
	`pickedUpAt` timestamp,
	`deliveredAt` timestamp,
	CONSTRAINT `rider_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `assignment_order_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `rider_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`phone` varchar(30),
	`lastLatitude` varchar(32),
	`lastLongitude` varchar(32),
	`lastLocationAt` timestamp,
	`isAvailable` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rider_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `rider_profile_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('customer','admin','staff','rider') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
CREATE INDEX `addresses_user_idx` ON `addresses` (`userId`);--> statement-breakpoint
CREATE INDEX `cart_items_cart_idx` ON `cart_items` (`cartId`);--> statement-breakpoint
CREATE INDEX `cart_items_menu_idx` ON `cart_items` (`menuItemId`);--> statement-breakpoint
CREATE INDEX `menu_category_idx` ON `menu_items` (`categoryId`);--> statement-breakpoint
CREATE INDEX `menu_available_idx` ON `menu_items` (`isAvailable`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`orderId`);--> statement-breakpoint
CREATE INDEX `history_order_idx` ON `order_status_history` (`orderId`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`userId`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`orderStatus`);--> statement-breakpoint
CREATE INDEX `assignment_rider_idx` ON `rider_assignments` (`riderUserId`);