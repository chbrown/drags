'use strict'; /*jslint nomen: true, node: true, indent: 2, debug: true, vars: true, es5: true */

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    handlebars: {
      all: {
        glob: 'templates/*.mu',
        dest: 'static/templates.js'
      }
    },
    uglify: {
      all: {
        options: {
          mangle: false
        },
        files: {
          'static/compiled.js': [
            'static/lib/json2.js',
            'static/lib/underscore.js',
            'static/lib/jquery.js',
            'static/lib/backbone.js',
            'static/lib/jquery.flags.js',
            'static/lib/jquery.cookie.js',
            'static/lib/handlebars.runtime.js',
            // 'static/local.js',
          ]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-handlebars');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', ['handlebars','uglify']);
};
