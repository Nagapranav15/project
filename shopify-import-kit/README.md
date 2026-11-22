# Jumper: add 20 sample products to Shopify

This kit has 20 ready-made products (10 single trunks and 10 packs), each with sizes S to XXL, prices, descriptions, tags, stock (25 per size) and photos. Import them in one go. Nothing needs to be typed.

| File | What it is |
|---|---|
| `products-import.csv` | The 20 products. Works straight away. **Use this one first.** |
| `products-import-with-swatches.csv` | The same 20 products, plus two extra fields the theme uses for colour dots and colour names. Needs Step 1 first. |
| `images/` | All 26 product photos, named by product. Only needed if you ever add photos by hand. |

The CSV points to the photos on GitHub, and Shopify downloads them during the import. The `images` folder must be on GitHub (it is once it has been pushed) for the photos to arrive.

## Step 1 (optional, 2 minutes): colour swatches

Skip this if you just want the products in. The theme still works, only without colour dots and colour names. If you want them:

1. In Shopify admin, go to **Settings → Custom data → Products → Add definition**.
2. First definition: Name `Swatch`, Namespace and key `custom.swatch`, Type **Single line text**. Save.
3. Second definition: Name `Colour label`, Namespace and key `custom.colour_label`, Type **Single line text**. Save.
4. Use `products-import-with-swatches.csv` in Step 2.

## Step 2: import the products

1. Go to **Products** in Shopify admin and click **Import** (top right).
2. Click **Add file** and choose `products-import.csv` (or the swatches one).
3. Tick **Overwrite existing products that have the same handle**. This replaces your old Maroon, Heather and other trunks with these complete ones, so you don't end up with duplicates.
4. Click **Upload and continue**. Shopify shows a preview: 20 products. Click **Import products**.
5. Wait a few minutes. Shopify downloads the photos in the background, so they appear a little after the products do.

## Step 3: check it worked

- **Products** shows 20 products, all **Active**, each with photos and 5 variants (S, M, L, XL, XXL), 25 in stock per size.
- Open your store. The **Shop** page, the home page **Shop the drop** section, the bag, and the size slider on a product page all use these products now.

## Step 4: make sure they sell on your store

The import publishes them to the Online Store. If a product does not show on the site, open it, find **Sales channels and apps** on the right, and make sure **Online Store** is ticked.

## What you get

**Single trunks (Rs. 799 to 899):** Maroon, Sunshine, Navy (on sale, was 999), Heather, Charcoal, Midnight, Court Print, Poolside, Starry, Sunset.

**Packs (Rs. 1,499 to 3,499, each shown with a "was" price):** Loud 3 Pack, Loud 5 Pack, Neutral 3 Pack, Print 3 Pack, Warm 3 Pack, Cool 3 Pack, Crew 3 Pack, Gym Duo Pack, Office Duo Pack, Sunrise Duo Pack.

Products tagged **New in** get the corner label on the shop cards (Maroon, Sunshine, Court Print, Starry, Loud 3 Pack, Crew 3 Pack). The tag name is set in the theme editor under Theme settings, as "Product tag that shows the corner label".

## Change things later

Everything can be edited in **Products** like any other product. To change prices or stock in bulk, export your products (**Products → Export**), edit the CSV and import it again with Overwrite ticked.

## If something goes wrong

- **A photo is missing:** open that product, click **Add media**, and drag the matching file from the `images` folder. Files are named like `maroon-trunk-1.jpg`.
- **Shopify says a column is not recognised or the swatch fields are missing:** you used the swatches file without Step 1. Do Step 1 first, or import `products-import.csv` instead.
- **You see duplicates, such as "Maroon Trunk" twice:** you imported without the Overwrite tick. Delete the old ones and keep the new ones.
- **The import says a product has no title:** the file was edited and re-saved in Excel with a different format. Re-download the original, and open it only in Shopify, or in Numbers or Google Sheets and save as CSV.

## Replace with your own later

These photos are the Jumper campaign shots used on your site, and the pack pictures are made from them. When you have real product photos, open the product, delete the old photo and add yours.
