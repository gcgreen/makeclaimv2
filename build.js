const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const MarkdownIt = require("markdown-it");

const md = new MarkdownIt();

const contentDir = "content";
const templatePath = "templates/page.html";

// Read all numbered markdown files, for example 01.md, 02.md, 03.md
const files = fs
  .readdirSync(contentDir)
  .filter((file) => /^\d+\.md$/i.test(file))
  .sort((a, b) => {
    return parseInt(a, 10) - parseInt(b, 10);
  });

if (files.length === 0) {
  throw new Error("No numbered Markdown files found in /content");
}

// Convert a title into a URL-friendly filename
function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Add GOV.UK classes to Markdown-generated HTML
function addGovukClasses(html) {
  return html
    .replaceAll("<h2>", '<h2 class="govuk-heading-l">')
    .replaceAll("<h3>", '<h3 class="govuk-heading-m">')
    .replaceAll("<h4>", '<h4 class="govuk-heading-s">')
    .replaceAll("<p>", '<p class="govuk-body">')
    .replaceAll("<a ", '<a class="govuk-link" ')
    .replaceAll("<ul>", '<ul class="govuk-list govuk-list--bullet">')
    .replaceAll("<ol>", '<ol class="govuk-list govuk-list--number">');
}

// Read and validate all chapters
const chapters = files.map((file, index) => {
  const filePath = path.join(contentDir, file);
  const source = fs.readFileSync(filePath, "utf8");
  const parsed = matter(source);

  const title = parsed.data.title?.trim();

  if (!title) {
    throw new Error(`${file} is missing a title`);
  }

  const slug = slugify(title);

  if (!slug) {
    throw new Error(`${file} has a title that cannot be turned into a URL`);
  }

  return {
    file,
    number: parseInt(file, 10),
    title,
    slug,
    markdown: parsed.content,
    index
  };
});

// Check for duplicate titles / generated filenames
const slugs = new Set();

for (const chapter of chapters) {
  if (slugs.has(chapter.slug)) {
    throw new Error(
      `Two chapters generate the same filename: ${chapter.slug}.html`
    );
  }

  slugs.add(chapter.slug);
}

// Decide generated filename for each chapter
chapters.forEach((chapter, index) => {
  chapter.outputFile =
    index === 0
      ? "index.html"
      : `${chapter.slug}.html`;
});

// Generate the contents navigation
function buildContents(currentChapter) {
  const items = chapters
    .map((chapter) => {
      if (chapter === currentChapter) {
        return `
          <li>
            <span aria-current="page">
              ${chapter.title}
            </span>
          </li>`;
      }

      return `
          <li>
            <a class="govuk-link" href="./${chapter.outputFile}">
              ${chapter.title}
            </a>
          </li>`;
    })
    .join("");

  return `
<nav class="prototype-contents-list" aria-label="Contents">

  <h2 class="prototype-contents-list__title">
    Contents
  </h2>

  <ol class="prototype-contents-list__list">
${items}
  </ol>

</nav>`;
}

// Optional previous / next navigation
function buildPagination(currentIndex) {
  const previous = chapters[currentIndex - 1];
  const next = chapters[currentIndex + 1];

  if (!previous && !next) {
    return "";
  }

  let html = `
<nav class="govuk-pagination govuk-pagination--block" aria-label="Pagination">
`;

  if (previous) {
    html += `
  <div class="govuk-pagination__prev">

    <a class="govuk-link govuk-pagination__link"
       href="./${previous.outputFile}"
       rel="prev">

      <svg
        class="govuk-pagination__icon govuk-pagination__icon--prev"
        xmlns="http://www.w3.org/2000/svg"
        height="13"
        width="15"
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 15 13">

        <path
          d="m6.5 12.4-6-6 6-6 1.4 1.4L4.3 5.4H15v2H4.3L7.9 11z">
        </path>

      </svg>

      <span class="govuk-pagination__link-title">
        Previous
      </span>

      <span class="govuk-visually-hidden">
        :
      </span>

      <span class="govuk-pagination__link-label">
        ${previous.title}
      </span>

    </a>

  </div>
`;
  }

  if (next) {
    html += `
  <div class="govuk-pagination__next">

    <a class="govuk-link govuk-pagination__link"
       href="./${next.outputFile}"
       rel="next">

      <span class="govuk-pagination__link-title">
        Next
      </span>

      <span class="govuk-visually-hidden">
        :
      </span>

      <span class="govuk-pagination__link-label">
        ${next.title}
      </span>

      <svg
        class="govuk-pagination__icon govuk-pagination__icon--next"
        xmlns="http://www.w3.org/2000/svg"
        height="13"
        width="15"
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 15 13">

        <path
          d="m8.5.6 6 6-6 6-1.4-1.4 3.6-3.6H0v-2h10.7L7.1 2z">
        </path>

      </svg>

    </a>

  </div>
`;
  }

  html += `
</nav>`;

  return html;
}

// Load shared HTML template
const template = fs.readFileSync(templatePath, "utf8");

// Build one HTML page for every Markdown file
chapters.forEach((chapter, index) => {
  let content = md.render(chapter.markdown);

  content = addGovukClasses(content);

  const contents = buildContents(chapter);
  const pagination = buildPagination(index);

  const output = template
    .replaceAll("{{chapterTitle}}", chapter.title)
    .replaceAll("{{contents}}", contents)
    .replaceAll("{{content}}", content)
    .replaceAll("{{pagination}}", pagination);

  fs.writeFileSync(chapter.outputFile, output);

  console.log(
    `Built ${chapter.file} -> ${chapter.outputFile}`
  );
});

console.log(`Built ${chapters.length} chapters successfully`);
