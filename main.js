"use strict";

// Ringo modules
const fs = require("fs");
const system = require("system");
const {Parser} = require("ringo/args");
const logger = require("ringo/logging").getLogger(module.id);
const objects = require("ringo/utils/objects");
const strings = require("ringo/utils/strings");

// external modules
const commonmark = require("commonmark");
const {Reinhardt} = require("reinhardt");

// app-specific modules
const scanner = require("./lib/scanner");

// Java NIO
const defaultFS = java.nio.file.FileSystems.getDefault();

const main = function(args) {
   let contentDir, outputDir, staticDir, templateDir;

   if (args.length === 1) {
      if (fs.isDirectory(args[0])) {
         contentDir = fs.join(args[0], "content");
         outputDir = fs.join(args[0], "output");
         staticDir = fs.join(args[0], "static");
         templateDir = fs.join(args[0], "templates");
      }
   } else {
      if (args.length === 2 && args[0] === "init") {
         const emptyProjectDir = args[1];
         if (!fs.isDirectory(emptyProjectDir)) {
            logger.error("Could not initialize project in non-existing directory {}", emptyProjectDir);
            return 1;
         } else if (fs.list(emptyProjectDir).some(function(file) { return file.charAt(0) !== "." })) {
            logger.error("Could not initialize project in non-empty directory {}", emptyProjectDir);
            return 1;
         } else {
            fs.makeDirectory(fs.join(emptyProjectDir, "content"));
            fs.makeDirectory(fs.join(emptyProjectDir, "output"));
            fs.makeDirectory(fs.join(emptyProjectDir, "static"));
            fs.makeDirectory(fs.join(emptyProjectDir, "templates"));
            fs.write(fs.join(emptyProjectDir, "content", "index.md"), "# Hello World!\n\n Edit me.");
            fs.write(fs.join(emptyProjectDir, "static", "main.css"), "html { background: LightCyan; }\n\nh1 { color: DarkSlateBlue; }");
            fs.write(fs.join(emptyProjectDir, "templates", "base.html"),
                "<!DOCTYPE html>\n<html><head><title>{{ title }}</title>" +
                "<link rel='stylesheet' href='./static/main.css'></head>" +
                "<body>{{ content|safe }}</body>" +
                "</html>");
         }

         logger.info("Created project stub at {}", emptyProjectDir);
         return 0;
      }

      let parser = new Parser();
      parser.addOption("c", "content", "CONTENT-DIR", "Directory containing the markdown content files.");
      parser.addOption("o", "output", "OUTPUT-DIR", "Output directory for the parsed and generated files.");
      parser.addOption("s", "static", "STATIC-DIR", "This directory will be copied into the output directory.");
      parser.addOption("t", "templates", "TEMPLATE-DIR", "Directory containing the reinhardt templates.");

      let options = parser.parse(args);

      if (options.static == null || options.output == null || options.content == null || options.templates == null) {
         // Print error
         logger.error("Insufficient arguments!\n" + parser.help());
         return 1;
      }

      contentDir = options.content;
      outputDir = options.output;
      staticDir = options.static;
      templateDir = options.templates;
   }

   // check given directories
   if (!fs.isDirectory(contentDir) || !fs.isDirectory(outputDir) || !fs.isDirectory(staticDir)) {
      logger.error("All directories must exist!");
      return 1;
   }

   if (!fs.exists(fs.join(templateDir, "base.html"))) {
      logger.error("base.html template not found: " + fs.join(templateDir, "base.html"));
      return 1;
   }

   // configures the templating environment
   let templateEnv = new Reinhardt({
      loader: templateDir
   });
   let template = templateEnv.getTemplate("base.html");

   let mdFiles = scanner.getMarkdownFiles(contentDir);

   // now process the markdown files
   mdFiles = mdFiles.map(function(vinyl) {
      let content = commonmark.process(fs.read(vinyl.path));
      let title = strings.startsWith(content, "<h1>") ? content.substring(4, content.indexOf("</h1>")) : "";

      return objects.merge(vinyl, {
         "html": template.render({
            "vinyl": vinyl,
            "title": title,
            "content": content
         })
      });
   });

   // now write the output files
   mdFiles.forEach(function(vinyl) {
      let destDir = fs.join(outputDir, vinyl.subDir);
      let destFile = fs.join(destDir, vinyl.name + ".html");

      if (!fs.exists(destDir)) {
         fs.makeTree(destDir);
      }

      logger.info("Writing", destFile);
      fs.write(destFile, vinyl.html);
   });

   // Copy the static files
   logger.info("Copying static files ...");
   fs.copyTree(staticDir, fs.join(outputDir, defaultFS.getPath(staticDir).getFileName()));

   logger.info("Done.");
   return 0;
};

if (require.main === module) {
   system.exit(main(system.args.slice(1)));
}
