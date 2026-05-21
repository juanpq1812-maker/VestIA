# Category Constraint Update

Run the following SQL in Supabase to add the `body` category to the `clothing_items` table constraint:

```sql
ALTER TABLE clothing_items 
DROP CONSTRAINT clothing_items_category_check;

ALTER TABLE clothing_items 
ADD CONSTRAINT clothing_items_category_check 
CHECK (category IN ('top', 'bottom', 'dress', 'outerwear', 'footwear', 'accessory', 'body'));
```
