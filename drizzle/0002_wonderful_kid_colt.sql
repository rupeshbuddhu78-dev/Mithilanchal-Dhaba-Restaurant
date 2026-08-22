CREATE TABLE `payment_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`userId` int NOT NULL,
	`paymentProvider` enum('stripe','cashfree') NOT NULL,
	`providerOrderId` varchar(96) NOT NULL,
	`paymentSessionId` text,
	`providerPaymentId` varchar(128),
	`paymentAttemptStatus` enum('created','pending','paid','failed','expired','cancelled') NOT NULL DEFAULT 'created',
	`amountPaise` int NOT NULL,
	`idempotencyKey` varchar(96) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_attempt_provider_order_unique` UNIQUE(`paymentProvider`,`providerOrderId`),
	CONSTRAINT `payment_attempt_idempotency_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `payment_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`webhookProvider` enum('stripe','cashfree') NOT NULL,
	`providerEventId` varchar(160) NOT NULL,
	`orderId` int,
	`payloadHash` varchar(64) NOT NULL,
	`processedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_webhook_event_unique` UNIQUE(`webhookProvider`,`providerEventId`)
);
--> statement-breakpoint
ALTER TABLE `orders` MODIFY COLUMN `paymentMethod` enum('cod','stripe','cashfree') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `payment_attempt_order_idx` ON `payment_attempts` (`orderId`);--> statement-breakpoint
CREATE INDEX `payment_webhook_order_idx` ON `payment_webhook_events` (`orderId`);