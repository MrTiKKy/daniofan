CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"brand" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"unit" text DEFAULT '' NOT NULL,
	"unit_qty" real,
	"normal_price" numeric(10, 2) NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "products_name_lower_idx" ON "products" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "products_brand_lower_idx" ON "products" USING btree (lower("brand"));