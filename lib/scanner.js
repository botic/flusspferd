"use strict";

var fs = require("fs");
var strings = require("ringo/utils/strings");
var logger = require("ringo/logging").getLogger(module.id);

var defaultFS = java.nio.file.FileSystems.getDefault();

exports.getMarkdownFiles = function(directory) {
   if (fs.exists(directory) && fs.isDirectory(directory)) {
      let baseDir = defaultFS.getPath(directory).toAbsolutePath().normalize();

         // baseDir.toAbsolutePath().normalize().relativize(subDir.toAbsolutePath().normalize());
      return fs.listTree(directory).filter(function(file) {
         return fs.isFile(fs.join(directory, file)) && strings.endsWith(file, ".md");
      }).map(function(file) {
         let path = java.nio.file.FileSystems.getDefault().getPath(directory, file).toAbsolutePath().normalize();
         return {
            "path": path.toString(),
            "name": path.getFileName().toString().substring(0, path.getFileName().toString().length - 3),
            "baseDir": baseDir.toString(),
            "subDir": (baseDir.relativize(path.getParent())).toString()
         };
      });
   }

   return [];
};