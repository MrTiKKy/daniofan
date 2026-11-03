CREATE TABLE "catalog_pages" (
	"id" text PRIMARY KEY NOT NULL,
	"catalog_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"grid" jsonb,
	"chrome" jsonb,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'weekend' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"theme" text DEFAULT 'standard' NOT NULL,
	"start_date" text DEFAULT '' NOT NULL,
	"end_date" text DEFAULT '' NOT NULL,
	"permanent" boolean DEFAULT false NOT NULL,
	"cover_src" text,
	"grid" jsonb DEFAULT '{"cols":4,"rows":6}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magazine_drafts" (
	"kind" text PRIMARY KEY NOT NULL,
	"catalog_id" text,
	"active_index" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"date" text NOT NULL,
	"closed" boolean DEFAULT true NOT NULL,
	"open_time" text,
	"close_time" text,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "store_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" text NOT NULL,
	"day" text NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"open_time" text DEFAULT '07:00' NOT NULL,
	"close_time" text DEFAULT '21:00' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"lat" real DEFAULT 0 NOT NULL,
	"lng" real DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_pages" ADD CONSTRAINT "catalog_pages_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magazine_drafts" ADD CONSTRAINT "magazine_drafts_catalog_id_catalogs_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."catalogs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_exceptions" ADD CONSTRAINT "store_exceptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_hours" ADD CONSTRAINT "store_hours_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_pages_catalog_sort_idx" ON "catalog_pages" USING btree ("catalog_id","sort_order");--> statement-breakpoint
CREATE INDEX "catalogs_kind_status_idx" ON "catalogs" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX "catalogs_updated_idx" ON "catalogs" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "store_exceptions_store_date_idx" ON "store_exceptions" USING btree ("store_id","date");--> statement-breakpoint
CREATE INDEX "store_hours_store_day_idx" ON "store_hours" USING btree ("store_id","day");--> statement-breakpoint
CREATE INDEX "stores_sort_idx" ON "stores" USING btree ("sort_order");