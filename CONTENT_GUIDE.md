# Adding FounderLens Content

Founder and company detail pages can be generated from JSON. Existing hand-built HTML pages continue to work.

## Add A Founder

1. Create a prepared JSON file:

```bash
npm run new -- founder "Founder Name" "Company Name"
```

2. Open the new file in `data/founders/`.
3. Update the content, colors, image path, and sections.
4. Choose `founder-editorial` or `founder-modern` as the template.
5. Set `"published": true` when it should appear on `founders.html`.
6. Run:

```bash
npm run generate
```

The detail page is created at `Founders/your-founder-slug.html`.

You can also manually copy `data/starters/founder.json`.

## Add A Company

1. Create a prepared JSON file:

```bash
npm run new -- company "Company Name"
```

2. Update the content, colors, image path, and sections.
3. Set `"published": true` when it should appear on `company.html`.
4. Run:

```bash
npm run generate
```

The detail page is created at `companies/your-company-slug.html`.

You can also manually copy `data/starters/company.json`.

## Commands

```bash
npm run new -- founder "Name" "Company"
npm run new -- company "Name"
npm run generate        # Validate JSON and regenerate pages/catalogs
npm run generate:check  # Check that generated files are current
npm run generate:watch  # Regenerate whenever JSON/templates change
```

Generated HTML and `data/generated-catalog.js` should not be edited manually. Change the source JSON or template instead.

## Images

Store local images in `assets/` and use a root-relative project path such as:

```json
"image": "assets/founder-name.jpg"
```

External `https://` image URLs are also supported.
