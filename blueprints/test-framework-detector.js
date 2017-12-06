var fs = require('fs');
var path = require('path');
var VersionChecker = require('ember-cli-version-checker');

module.exports = function(blueprint) {
  blueprint.supportsAddon = function() {
    return false;
  };

  blueprint.filesPath = function() {
    var type;

    var dependencies = this.project.dependencies();
    if ('ember-qunit' in dependencies || 'ember-cli-qunit' in dependencies) {
      type = 'qunit';

    } else if ('ember-mocha' in dependencies) {
      type = 'mocha-0.12';

    } else if ('ember-cli-mocha' in dependencies) {
      var checker = new VersionChecker(this.project);
      if (fs.existsSync(this.path + '/mocha-0.12-files') && checker.for('ember-cli-mocha', 'npm').gte('0.12.0')) {
        type = 'mocha-0.12';
      } else {
        type = 'mocha';
      }

    } else {
      this.ui.writeLine('Couldn\'t determine test style - using QUnit');
      type = 'qunit';
    }

    return path.join(this.path, type + '-files');
  };

  return blueprint;
};
