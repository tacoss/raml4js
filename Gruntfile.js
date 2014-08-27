module.exports = function(grunt) {
  grunt.initConfig({
    watch: {
      all: {
        files: ['spec/**', 'lib/**'],
        tasks: ['jshint', 'jasmine_node']
      }
    },
    jshint: {
      all: ['Gruntfile.js', 'lib/**/*.js']
    },
    jasmine_node: {
      all: ['spec'],
      options: {
        coffee: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', ['jshint', 'jasmine_node']);
};
