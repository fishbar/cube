var path = require('path');
var fs = require('fs');
var coffee = require('coffee-script');
var JsProcessor = require('./processor_js');
var CoffeeReactTrans = require('coffee-react-transform');

/**
 * Class JsProcessor
 * @param {Object}   cube     the cube instance
 */
function CoffeeProcessor(cube) {
  this.cube = cube;
}
CoffeeProcessor.info = {
  type: 'script',
  ext: '.coffee'
};

CoffeeProcessor.prototype = {
  /**
   * process js file
   * @param {Path}     file     the module file relative path, based on cube base
   * @param {Object}   options  {root: path, compress:boolean, sourceMap:boolean, moduleWrap}
   * @param  {Function} callback({err, data:{source, code, sourceMap}})
   */
  process: function (file, options, callback) {
    var code;
    var root = options.root;
    try {
      code = fs.readFileSync(path.join(root, file), 'utf8');
      code = CoffeeReactTrans(code);
    } catch (e) {
      // e.message = 'file not found "' + filepath + '"';
      // e.name = 'FILE_NOT_FOUND';
      return callback(e);
    }
    // return origin code if no need to transfer
    if (!options.moduleWrap) {
      return callback(null, {source: code, code: code});
    }
    code = coffee.compile(code, {
      generatedFile: path.basename(file),
      header: true,
      shiftLine: true,
      sourceRoot: '',
      sourceFiles: [path.basename(file) + '?m'],
      sourceMap: options.sourceMap
    });
    if (options.release) {
      file = file.replace(/\.coffee/g, '.js');
      options.qpath = file;
    }
    this.processCode(file, code, options, callback);
  },
  processCode: JsProcessor.prototype.processCode
};

module.exports = CoffeeProcessor;