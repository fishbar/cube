var jsdom = require('jsdom');
var expect = require('expect.js');
var doc = '<html><head></head><body></body></html>';
document = jsdom.jsdom(doc, jsdom.level(2, 'core'));
window = document.parentWindow;
window.location.host = 'localhost'
require('../runtime/cube');
Cube = window.Cube;

String.prototype.startsWith = function (str){
  return this.indexOf(str) === 0;
};
var options = {
  charset: 'utf-8',
  base: '/static',
  remoteBase: 'http://cnd.aliyun.com/alishu',
  enableCss: true,
  timeout: 2000,
  version:"__version__",
  debug: true
};
function findNode(mod, tagName) {
  var nodes = document.getElementsByTagName(tagName);
  var node;
  nodes = Array.prototype.slice.call(nodes);
  nodes.forEach(function (v) {
    if (v.getAttribute('mod') === mod) {
      node = v;
    }
  });
  return node;
}
function removeAllScript() {
  var element = document.getElementsByTagName("script");
  for (index = element.length - 1; index >= 0; index--) {
    element[index].parentNode.removeChild(element[index]);
  }
}
describe('runtime/cube.js', function () {
  afterEach(function() {
    removeAllScript();
  });
  it('should ok when init', function () {
    Cube.init(options);
  });
  it('should ok when local load with requires', function () {
    currentScript = document.createElement('script');
    currentScript.src = window.location.host;
    document.currentScript = currentScript;
    var requires = ["/com/user/111.css.js","/js/base/com.js","/com/user/111.jade.js"];
    Cube("/com/user/index.js", requires, function(t,e,n){return function(){}});
    var scripts = document.getElementsByTagName('script');
    var requiresLoadedcCount = 0;
    for(var i = 0; i < scripts.length; ++i) {
      for(var j = 0; j < requires.length; ++j) {
        if(scripts[i].getAttribute('src').startsWith(options.base + requires[j])) {
          ++requiresLoadedcCount;
        }
      }
    }
    expect(requiresLoadedcCount).to.be(requires.length);
  });
  it('should ok when remote load with first layer requires', function () {
    currentScript = document.createElement('script');
    currentScript.src = options.remoteBase;
    document.currentScript = currentScript;
    var requires = [options.remoteBase + "/com/user/222.css.js", options.remoteBase + "/js/base/222.js"];
    Cube("/com/user/index.js", requires, function(mod, exports, require, async) {});
    var scripts = document.getElementsByTagName('script');
    var requiresLoadedcCount = 0;
    for(var i = 0; i < scripts.length; ++i) {
      for(var j = 0; j < requires.length; ++j) {
        if(scripts[i].getAttribute('src').startsWith( requires[j])) {
          ++requiresLoadedcCount;
        }
      }
    }
    expect(requiresLoadedcCount).to.be(requires.length);
  });
  it('should ok when remote load with second layer requires', function () {
    currentScript = document.createElement('script');
    currentScript.src = options.remoteBase;
    document.currentScript = currentScript;
    // second layer requires don't start with http
    var requires = ["/com/user/333.css.js", "/js/base/333.js"];
    Cube("/com/user/index.js", requires, function(mod, exports, require, async) {});
    var scripts = document.getElementsByTagName('script');
    var requiresLoadedcCount = 0;
    for(var i = 0; i < scripts.length; ++i) {
      if(scripts[i].getAttribute('src').startsWith(options.remoteBase))
        ++requiresLoadedcCount;
    }
    expect(requiresLoadedcCount).to.be(requires.length);
  });
  it('should ok when call remote require', function () {
    currentScript = document.createElement('script');
    currentScript.src = options.remoteBase;
    document.currentScript = currentScript;
    Cube._cached[options.remoteBase + '/444.js'] = function(){};
    Cube("/test.js", [], function(mod, exports, require, async) {
      expect(typeof require('/444.js')).to.be('function');
    });
  });
  it('should ok when call remote async', function () {
    currentScript = document.createElement('script');
    currentScript.src = options.remoteBase;
    document.currentScript = currentScript;
    Cube("/com/user/user.js", [], function(mod, exports, require, async) {
      async('/com/user/user.css');
      expect(typeof async).to.be('function');
    });
  });
});