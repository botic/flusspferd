# flusspferd

Flusspferd is a simple static site generator based RingoJS. It takes markdown files, processes them and uses
reinhardt templates to generate the final HTML.

## Getting started

You can generate a project stub by running flusspferd's
main script with the init parameter:

`ringo main.js init /path/to/emtpy-project/`

A good way to automatically update the output during development is `fswatch`, a cross-platform file change monitor. If you update one of your sources in the `content`, `templates`, or `static` dir, it will notify you about the changes. Here an example:

`fswatch -o /code/example.com/content/ /code/example.com/templates/ /code/example.com/static/ | xargs -n1 -I{} ringo main.js /code/example.com/`

## Convention over configuration

The easiest way to run flusspferd is to generate a project with the folders `content`, `output`, `static` and `templates`.
The `output` folder itself should be empty, the others contain the project's files.

    project
    ├── content
    │   └── index.md
    ├── output
    │   ├── index.html (generated)
    │   └── static (copied)
    │       └── image.png (copied)
    ├── static
    │   └── image.png
    └── templates
        └── base.html

Start the generator with `ringo main.js /path/to/project`.
Flusspferd will scan the `content` folder for markdown files and puts the result into the output folder.
All static files from the `static` folder will be copied to `output`.
You must provide a template named `base.html` in the `template` folder.
This template ist the master for all generated pages and will be rendered providing two properties: `content` and `title`.
If your markdown file starts with an &lt;h1&gt;, this will be the title for the page, otherwise its emtpy.
