"use strict";

// Ringo modules
const fs = require("fs");
const logger = require("ringo/logging").getLogger(module.id);
const objects = require("ringo/utils/objects");
const strings = require("ringo/utils/strings");

// external modules
const commonmark = require("commonmark");
const {Reinhardt} = require("reinhardt");

// app-specific modules
const scanner = require("./scanner");

// Java NIO
const defaultFS = java.nio.file.FileSystems.getDefault();

exports.generateProject = function(contentDir, staticDir, templateDir, outputDir) {
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
