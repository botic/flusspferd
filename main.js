"use strict";

// Ringo modules
var fs = require("fs");
var system = require("system");
var {Parser} = require("ringo/args");
var logger = require("ringo/logging").getLogger(module.id);
var objects = require("ringo/utils/objects");

// external modules
var commonmark = require("commonmark");
var {Environment} = require("reinhardt");

// app-specific modules
var scanner = require("./lib/scanner");

// Java NIO
var defaultFS = java.nio.file.FileSystems.getDefault();

var main = function(args) {
   let contentDir, outputDir, staticDir, templateDir;

   if (args.length === 1) {
      if (fs.isDirectory(args[0])) {
         contentDir = fs.join(args[0], "content");
         outputDir = fs.join(args[0], "output");
         staticDir = fs.join(args[0], "static");
         templateDir = fs.join(args[0], "templates");
      }
   } else {
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
   let templateEnv = new Environment({
      loader: templateDir
   });
   let template = templateEnv.getTemplate("base.html");

   let mdFiles = scanner.getMarkdownFiles(contentDir);

   // now process the markdown files
   mdFiles = mdFiles.map(function(vinyl) {
      return objects.merge(vinyl, {
         "html": template.render({
            "vinyl": vinyl,
            "content": commonmark.process(fs.read(vinyl.path))
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
