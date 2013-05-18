'use strict'; /*jslint nomen: true, node: true, indent: 2, debug: true, vars: true, es5: true */

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    handlebars: {
      all: {
        src: 'static/templates',
        ext: 'mu',
        dest: 'static/templates.js'
      }
    },
    uglify: {
      all: {
        options: {
          mangle: false
          // beautify: true
        },
        files: {
          'static/compiled.js': [
            'static/lib/js/json2.js',
            'static/lib/js/underscore.js',
            'static/lib/js/jquery.js',
            'static/lib/js/backbone.js',
            'static/lib/js/jquery.flags.js',
            'static/lib/js/jquery.cookie.js',
            'static/lib/js/handlebars.runtime.js',
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
