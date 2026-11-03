ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "promo_price" numeric(10, 2) DEFAULT '0' NOT NULL;
