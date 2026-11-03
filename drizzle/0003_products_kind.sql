ALTER TABLE "products" ADD COLUMN "kind" text DEFAULT 'live' NOT NULL;--> statement-breakpoint
CREATE INDEX "products_kind_idx" ON "products" USING btree ("kind");