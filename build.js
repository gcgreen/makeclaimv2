const fs = require('fs')
const matter = require('gray-matter')
const MarkdownIt = require('markdown-it')

const md = new MarkdownIt()

const source = fs.readFileSync('content/index.md', 'utf8')
const parsed = matter(source)

let html = md.render(parsed.content)

// Add GOV.UK classes
html = html
  .replaceAll('<h2>', '<h2 class="govuk-heading-l">')
  .replaceAll('<h3>', '<h3 class="govuk-heading-m">')
  .replaceAll('<p>', '<p class="govuk-body">')
  .replaceAll('<a ', '<a class="govuk-link" ')
  .replaceAll('<ul>', '<ul class="govuk-list govuk-list--bullet">')

const template = fs.readFileSync('templates/page.html', 'utf8')

const output = template
  .replace('{{title}}', parsed.data.title)
  .replace('{{content}}', html)

fs.writeFileSync('index.html', output)
