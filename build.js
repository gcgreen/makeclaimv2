const fs = require("fs");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt();

const source = fs.readFileSync("content/index.md", "utf8");
const parsed = matter(source);

let content = md.render(parsed.content);

// Apply GOV.UK Frontend classes to Markdown output
content = content
  .replaceAll("<h2>", '<h2 class="govuk-heading-l">')
  .replaceAll("<h3>", '<h3 class="govuk-heading-m">')
  .replaceAll("<p>", '<p class="govuk-body">')
  .replaceAll("<a ", '<a class="govuk-link" ')
  .replaceAll("<ul>", '<ul class="govuk-list govuk-list--bullet">')
  .replaceAll("<ol>", '<ol class="govuk-list govuk-list--number">');

const template = fs.readFileSync("templates/page.html", "utf8");

const output = template
  .replace("{{title}}", parsed.data.title)
  .replace("{{content}}", content);

fs.writeFileSync("index.html", output);

console.log("Prototype built successfully");
