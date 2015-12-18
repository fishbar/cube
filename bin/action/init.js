'use strict';

var fs = require('xfs');
var path = require('path');

function filePath(file) {
  var base = getCwd();
  return path.join(base, file);
}
function checkFile(file) {
  return fs.existsSync(filePath(file));
}

function getCwd() {
  return process.cwd();
}

module.exports = function (option) {
  // TODO init project
  // copy cube.js
  if (!checkFile('./cube.min.js') || option.force) {
    var codeCube = fs.readFileSync(sourcePath('./runtime/cube.min.js')).toString();
    if (option.css) {
      console.log('enable mcss');
      codeCube += '\n//cube_css.min.js\n' + fs.readFileSync(sourcePath('./runtime/cube_css.min.js'));
      optmizeInfo();
    }
    fs.sync().save(filePath('./cube.min.js'), codeCube);

    if (option.jade) {
      console.log('enable jade');
      codeCube = '\n//jade_runtime\n' + fs.readFileSync(sourcePath('./runtime/jade_runtime.min.js'));
      fs.sync().save(filePath('./node_modules/jade_runtime.js'), codeCube);
    }
    if (option.ejs) {
      console.log('enable ejs');
      codeCube = '\n//ejs_runtime\n' + fs.readFileSync(sourcePath('./runtime/ejs_runtime.min.js'));
      fs.sync().save(filePath('./node_modules/ejs_runtime.js'), codeCube);
    }
    console.log('inited cube.min.js');
  } else {
    console.log('file already exist: ./cube.min.js');
  }
  if (!checkFile('./start.html')) {
    fs.sync().save(filePath('./start.html'), fs.readFileSync(sourcePath('./runtime/start.html')));
    console.log('inited start.html');
  } else {
    console.log('file already exist: ./start.html');
  }
  if (!checkFile('./package.json')) {
    fs.sync().save(filePath('./package.json'), fs.readFileSync(sourcePath('./runtime/cube.json')));
    console.log('inited cube.json');
  } else {
    console.log('file already exist: ./cube.json');
  }
  if (!checkFile('./main.js')) {
    fs.sync().save(filePath('./main.js'),
      'document.getElementById("msg").innerHTML = "hello, Cube";\n' +
      'document.getElementById("show").value = document.getElementById("initscript").innerHTML;\n' +
      'exports.run = function () {console.log("app started!")};'
    );
    console.log('inited main.js');
  } else {
    console.log('file already exist: ./main.js');
  }
  fs.sync().mkdir('test');

  console.log('successfully inited');
}