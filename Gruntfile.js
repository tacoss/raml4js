module.exports = function(grunt) {
  grunt.initConfig({
    watch: {
      all: {
        files: ['spec/**', 'lib/**'],
        tasks: ['jasmine_node']
      }
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
};
