import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [type, name, company = "Company Name"] = process.argv.slice(2);

if (!["founder", "company"].includes(type) || !name) {
  console.error('Usage: npm run new -- founder "Founder Name" "Company Name"');
  console.error('   or: npm run new -- company "Company Name"');
  process.exit(1);
}

const slug = name.toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const starter = JSON.parse(fs.readFileSync(path.join(root, `data/starters/${type}.json`), "utf8"));
starter.slug = slug;
starter.name = name;
starter.metaDescription = type === "founder"
  ? `FounderLens analysis of ${name} and the strategy behind ${company}.`
  : `FounderLens strategic company analysis of ${name}.`;

if (type === "founder") {
  starter.company = company;
  starter.initials = name.split(/\s+/).map(word => word[0]).join("").slice(0, 3).toUpperCase();
} else {
  starter.tagline = `${name} strategic analysis`;
}

const destination = path.join(root, `data/${type === "founder" ? "founders" : "companies"}/${slug}.json`);
if (fs.existsSync(destination)) {
  console.error(`${path.relative(root, destination)} already exists.`);
  process.exit(1);
}

fs.writeFileSync(destination, `${JSON.stringify(starter, null, 2)}\n`);
console.log(`Created ${path.relative(root, destination)}`);
console.log('Complete the JSON, set "published": true, then run "npm run generate".');
