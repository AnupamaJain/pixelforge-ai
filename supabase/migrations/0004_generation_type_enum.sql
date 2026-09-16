-- Adds the PRODUCT_SCENE generation type.
--
-- ALTER TYPE ... ADD VALUE must be committed before the new value can be used,
-- so it lives in its own migration ahead of 0005.

alter type generation_type add value if not exists 'PRODUCT_SCENE';
