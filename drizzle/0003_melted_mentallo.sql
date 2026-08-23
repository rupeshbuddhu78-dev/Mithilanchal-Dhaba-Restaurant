ALTER TABLE `addresses` ADD `latitude` varchar(32);--> statement-breakpoint
ALTER TABLE `addresses` ADD `longitude` varchar(32);--> statement-breakpoint
ALTER TABLE `addresses` ADD `locationConsentAt` timestamp;--> statement-breakpoint
ALTER TABLE `rider_assignments` ADD `lastLatitude` varchar(32);--> statement-breakpoint
ALTER TABLE `rider_assignments` ADD `lastLongitude` varchar(32);--> statement-breakpoint
ALTER TABLE `rider_assignments` ADD `lastLocationAt` timestamp;--> statement-breakpoint
ALTER TABLE `rider_assignments` ADD `trackingConsentAt` timestamp;--> statement-breakpoint
ALTER TABLE `rider_assignments` ADD `trackingStoppedAt` timestamp;