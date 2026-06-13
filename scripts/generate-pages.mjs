import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const watchMode = process.argv.includes("--watch");

const templateFiles = {
  "founder-editorial": "templates/founder-editorial.html",
  "founder-modern": "templates/founder-modern.html",
  "company-strategy": "templates/company-strategy.html"
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJsonFiles(directory) {
  return fs.readdirSync(path.join(root, directory))
    .filter(file => file.endsWith(".json") && !file.startsWith("_"))
    .sort()
    .map(file => {
      const source = path.join(root, directory, file);
      try {
        return { source, data: JSON.parse(fs.readFileSync(source, "utf8")) };
      } catch (error) {
        throw new Error(`${path.relative(root, source)}: ${error.message}`);
      }
    });
}

function validate(item, source) {
  const label = path.relative(root, source);
  const required = ["type", "template", "slug", "name", "tagline", "summary", "metaDescription", "theme", "tags", "kpis", "sections"];
  required.forEach(key => assert(item[key] !== undefined && item[key] !== "", `${label}: missing "${key}"`));
  assert(["founder", "company"].includes(item.type), `${label}: type must be "founder" or "company"`);
  assert(templateFiles[item.template], `${label}: unknown template "${item.template}"`);
  assert(item.slug === item.slug.toLowerCase() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug), `${label}: slug must use lowercase kebab-case`);
  assert(Array.isArray(item.tags), `${label}: tags must be an array`);
  assert(Array.isArray(item.kpis) && item.kpis.length > 0, `${label}: add at least one KPI`);
  assert(Array.isArray(item.sections) && item.sections.length > 0, `${label}: add at least one section`);
  assert(item.theme.primary && item.theme.accent, `${label}: theme requires primary and accent colors`);
  if (item.type === "founder") {
    assert(item.company && item.industry && item.initials && item.added && item.card, `${label}: founder requires company, industry, initials, added, and card`);
    assert(item.template.startsWith("founder-"), `${label}: founders must use a founder template`);
  } else {
    assert(item.category && item.card, `${label}: company requires category and card`);
    assert(item.template.startsWith("company-"), `${label}: companies must use a company template`);
  }
}

function localAsset(source = "") {
  if (!source) return "";
  return /^(?:https?:)?\/\//.test(source) ? source : `../${source.replace(/^\.?\//, "")}`;
}

function renderImage(item) {
  const source = localAsset(item.image || item.logo);
  if (source) return `<img src="${escapeHtml(source)}" alt="${escapeHtml(item.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><span class="initials" style="display:none">${escapeHtml(item.initials || initials(item.name))}</span>`;
  return `<span class="initials">${escapeHtml(item.initials || initials(item.name))}</span>`;
}

function renderTags(tags) {
  return tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function renderKpis(kpis) {
  return kpis.map(kpi => `<div class="kpi"><strong>${escapeHtml(kpi.value)}</strong><span>${escapeHtml(kpi.label)}</span></div>`).join("");
}

function renderSections(sections) {
  return sections.map((section, index) => {
    const quote = section.quote ? `<blockquote class="quote">${escapeHtml(section.quote)}</blockquote>` : "";
    return `<section class="section"><div><p class="section-num">${String(index + 1).padStart(2, "0")} · Analysis</p><h2>${escapeHtml(section.title)}</h2></div><div><p>${escapeHtml(section.body)}</p>${quote}</div></section>`;
  }).join("\n");
}

function renderPage(item) {
  const template = fs.readFileSync(path.join(root, templateFiles[item.template]), "utf8");
  const values = {
    pageTitle: `${item.name} — FounderLens`,
    metaDescription: item.metaDescription,
    primary: item.theme.primary,
    accent: item.theme.accent,
    eyebrow: item.eyebrow || (item.type === "founder" ? "Founder Analysis" : "Company Analysis"),
    name: item.name,
    company: item.company || "",
    tagline: item.tagline,
    summary: item.summary,
    image: renderImage(item),
    tags: renderTags(item.tags),
    kpis: renderKpis(item.kpis),
    sections: renderSections(item.sections)
  };
  return Object.entries(values).reduce((html, [key, value]) => html.replaceAll(`{{${key}}}`, value), template);
}

function initials(name) {
  return name.split(/\s+/).map(word => word[0]).join("").slice(0, 3).toUpperCase();
}

function founderCatalog(item) {
  return {
    name: item.name,
    company: item.company,
    industry: item.industry,
    tags: item.tags,
    color: item.card.color,
    textColor: item.card.textColor || "#fff",
    initials: item.initials,
    tagline: item.tagline,
    image: item.image || "",
    file: `Founders/${item.slug}.html`,
    added: item.added
  };
}

function companyCatalog(item) {
  return {
    name: item.name,
    category: item.category,
    description: item.summary,
    logo: item.logo || "",
    tags: item.tags,
    file: `companies/${item.slug}.html`,
    color: item.card.color
  };
}

function writeOrCheck(relativePath, content) {
  const destination = path.join(root, relativePath);
  if (checkOnly) {
    const current = fs.existsSync(destination) ? fs.readFileSync(destination, "utf8") : "";
    assert(current === content, `${relativePath} is out of date. Run "npm run generate".`);
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
}

function generate() {
  const sources = [
    ...readJsonFiles("data/founders"),
    ...readJsonFiles("data/companies")
  ];
  const slugs = new Set();
  sources.forEach(({ data, source }) => {
    validate(data, source);
    const key = `${data.type}:${data.slug}`;
    assert(!slugs.has(key), `${path.relative(root, source)}: duplicate slug "${data.slug}"`);
    slugs.add(key);
    const directory = data.type === "founder" ? "Founders" : "companies";
    writeOrCheck(`${directory}/${data.slug}.html`, renderPage(data));
  });

  const published = sources.map(entry => entry.data).filter(item => item.published);
  const founders = published.filter(item => item.type === "founder").map(founderCatalog);
  const companies = published.filter(item => item.type === "company").map(companyCatalog);
  const catalog = `/* Generated by npm run generate. Do not edit manually. */\nwindow.GENERATED_FOUNDERS = ${JSON.stringify(founders, null, 2)};\nwindow.GENERATED_COMPANIES = ${JSON.stringify(companies, null, 2)};\n`;
  writeOrCheck("data/generated-catalog.js", catalog);
  console.log(`${checkOnly ? "Checked" : "Generated"} ${sources.length} pages and ${published.length} published catalog entries.`);
}

generate();

if (watchMode) {
  console.log("Watching data and templates for changes...");
  let timer;
  ["data/founders", "data/companies", "templates"].forEach(directory => {
    fs.watch(path.join(root, directory), { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { generate(); } catch (error) { console.error(error.message); }
      }, 120);
    });
  });
}
