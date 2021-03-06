/*!
 * cube: runtime/cube.js
 * Authors  : fish (https://github.com/fishbar)
 * Authors  : HQidea (https://github.com/HQidea)
 * Create   : 2014-04-18 15:32:20
 * Refactor : 2016-02-29
 * CopyRight 2014 (c) Fish And Other Contributors
 *
 * this file is running in browser
 */
(function (global, alias) {
  /* short global val */
  var win = window;
  var doc = document;
  var log = console;

  /* settings */
  var base = '';
  var remoteBase = {};
  var remoteSeparator = ':';
  var charset = 'utf-8';
  var version;
  var strict = true;
  var debug = true;
  var entrances = {};  // Cube.use's cb

  var mockedProcess = {
    env: {NODE_ENV: 'production'}
  };
  var mockedGlobal = undefined;
  var esModule = true;

  var installedModules = {/*exports, fn, loaded, fired*/};  // The module cache
  var loading = {};
  var head = doc.querySelector('head');
  function noop() {}

  /* store requires before init */
  var inited = false;
  var loadQueue = [];
  console.time('cube load');
  /**
   * The require function
   * @param module
   * @param namespace
   * @returns {*}
   * @private
   */
  function __cube_require__(module, namespace) {
    if (arguments.length === 1) {
      return fireModule(module);
    } else {
      var css = fireModule(module);
      Cube.css(css, namespace, module);
      return module;
    }
  }

  /**
   * This function creates the load function
   */
  function __cube_load_creator__(referer) {
    /**
     * The load function
     * @param module
     * @param namespace
     * @param cb
     * @private
     */
    return function __cube_load__(module, namespace, cb) {
      if (arguments.length === 2 && typeof namespace === 'function') {
        cb = namespace;
        namespace = null;
        Cube.use(module, referer, cb);
      } else {
        Cube.use(module, referer, function (css) {
          css = Cube.css(css, namespace, module);
          cb && cb(css);
        });
      }
    };
  }

  Cube.setRemoteBase = function (_remoteBase) {
    Object.assign(remoteBase, _remoteBase);
  };

  /**
   * If mod is like 'remoteXXX:/com/user/index.js', replace remoteXXX with path defined in init()
   */
  function reBase(mod) {
    var offset = mod.indexOf ? mod.indexOf(remoteSeparator) : 0;
    if (offset > 0) {
      return remoteBase[mod.substr(0, offset)] + mod.substr(offset + 1);
    } else {
      return '';
    }
  }

  function fixUseModPath(mods) {
    var len = mods.length;
    var mod;
    for (var i = 0; i < len; i++) {
      mod = mods[i];
      if (mod.indexOf(remoteSeparator) === -1) {
        /** fix #12 **/
        if (mod.indexOf('./') === 0) {  // be compatible with ./test.js
          mods[i] = mod.substr(1);
        } else if (mod[0] !== '/') {    // be campatible with test.js
          mods[i] = '/' + mod;
        }
      }
    }
    return mods;
  }

  function checkAllDownloaded() {
    if (loadQueue.length) {
      return false;
    }
    for (var i in loading) {
      if (loading.hasOwnProperty(i)) {
        return false;
      }
    }
    console.timeEnd('cube load');
    startAppAndCallback();
  }

  /**
   * 下载模块
   * @param requires
   * @param referer
   */
  function load(requires, referer, customArgs) {
    customArgs = customArgs || {};
    if (typeof requires === 'string') {
      requires = [requires];
    }
    if (!inited) {
      loadQueue.push([requires, referer]);
      return;
    }

    requires.forEach(function (require) {
      if (installedModules[require]) {
        return;
      }
      // download form server
      var script = doc.createElement('script');
      script.type = 'text/javascript';
      script.async = 'true';
      script.charset = charset;
      script.onerror = () => {
        Cube(require, [], () => {
          console.error(`load module: ${require} failed.`);
        });
      };

      var rebaseName = reBase(require);
      var srcPath = rebaseName || (base + require);

      var q = [];
      if (version) {
        q.push(version);
      }
      if (debug) {
        q.push('m');
        q.push('ref=' + referer);
      }
      if (customArgs[require]) {
        Array.prototype.push.apply(q, Object.keys(customArgs[require]).map(c => {
          return `${c}=${customArgs[require][c]}`
        }));
      }

      if (q.length) {
        script.src = srcPath + '?' + q.join('&');
      } else {
        script.src = srcPath;
      }
      head.appendChild(script);
      installedModules[require] = {
        exports: {},
        loaded: false,
        fired: false
      };
      loading[require] = true;
    });
    checkAllDownloaded();
  }

  /**
   * 运行模块
   * @param module
   * @returns {*}
   */
  function fireModule(module) {
    var m = installedModules[module];
    if (!m) {
      if (strict) {
        throw new Error('Cube Error: Cannot find module ' + '\'' + module + '\'');
      } else {
        log.error(e);
        return {};
      }
    }
    if (!m.fired) {
      m.fired = true;
      if (strict){
        m.exports = m.fn.apply(global, [m, m.exports, __cube_require__, __cube_load_creator__(module), mockedProcess, mockedGlobal]);
      } else {
        try {
          m.exports = m.fn.apply(global, [m, m.exports, __cube_require__, __cube_load_creator__(module), mockedProcess, mockedGlobal]);
        } catch (e) {
          log.error(e);
          m.exports = {};
        }
      }
    }
    return m.exports;
  }

  /**
   * 从Cube.use的文件开始自上而下运行,并调用回调函数
   */
  function startAppAndCallback() {
    var key, arr;
    console.time('cube exec');
    for (key in entrances) {
      if (entrances.hasOwnProperty(key)) {
        arr = key.split(',');
        arr.forEach(function (entrance) {
          var count = 0;
          fireModule(entrance);
          entrances[key].forEach(function (fn) {
            var called = fn(installedModules[entrance].exports);
            if (called) {
              count++;
            }
          });
          if (entrances[key].length === count) {  // 回调函数都执行完后删除
            delete entrances[key];
          }
        });
      }
    }
    console.timeEnd('cube exec');
  }


  /**
   * 非构造函数,只供模块的wrapper调用
   * @param name
   * @param requires
   * @param callback
   */
  function Cube(name, requires, callback) {
    var mod = installedModules[name];
    if (!mod) {
      mod = installedModules[name] = {
        exports: {},
        fired: false
      };
    }
    mod.loaded = true;
    mod.fn = callback;
    if (loading[name]) {
      delete loading[name];
      load(requires, name);
    } else if (requires.length) {
      load(requires, name);
    }
  }

  /** version, will replace in `make release` **/
  Cube.toString = function () {
    return 'Cube:v$$version$$';
  };

  /**
   * init global setting for Cube
   * @static
   * @param  {Object} config {base, remoteBase, charset, version}
   */
  Cube.init = function (config) {
    if (config.base && config.base !== '/') {
      base = config.base.replace(/\/$/, '');
    }
    if (config.remoteBase) {
      for (var key in config.remoteBase) {
        if (config.remoteBase.hasOwnProperty(key)) {
          remoteBase[key] = config.remoteBase[key].replace(/\/$/, '');
        }
      }
    }
    if (config.charset) {
      charset = config.charset;
    }
    if (config.version) {
      version = config.version;
    }
    if (config.debug !== undefined) {
      debug = config.debug;
    }
    if (config.strict !== undefined) {
      strict = config.strict;
    }
    if (config.env) {
      mockedProcess.env.NODE_ENV = config.env;
    }
    if (config.global) {
      mockedGlobal = config.global;
    }
    // support ES6 module, default is true
    if (config.esModule !== undefined) {
      esModule = config.esModule
    }

    inited = true;

    while (loadQueue.length) {
      var deps = loadQueue.shift();
      load(deps[0], deps[1]);
    }

    return this;
  };
  /**
   * loading module async, this function only support abs path
   * @public
   * @param  {Path}     mods module abs path
   * @param  {Function} cb  callback function, usually with module.exports as it's first param
   * @param  {Boolean}  noFix used only in single mode
   */
  Cube.use = function (mods, referer, cb, noFix) {
    if (!mods) {
      throw new Error('Cube.use(moduleName) moduleName is undefined!');
    }
    if (typeof referer === 'function') {
      noFix = cb;
      cb = referer;
      referer = undefined;
    }
    if (!referer) {
      referer = 'Cube.use';
    }
    cb = cb || noop;

    if (typeof mods === 'string') {
      mods = [mods];
    }

    let customArgs = {};
    mods = mods.map(m => {
      const tmpArr = m.split('?');
      const mod = tmpArr[0];
      const custom = tmpArr[1];

      if (!!custom) customArgs[mod] = parseQueryString(custom);
      return mod;
    });

    if (!noFix) {
      mods = fixUseModPath(mods);
    }

    if (!entrances[mods]) {
      entrances[mods] = [];
    }
    entrances[mods].push(function () {
      var apps = [];
      var length = mods.length;
      var firing = false;

      return function (exports) {
        if (firing) {
          return;
        }
        apps.push(exports);
        if (esModule) {
          apps = apps.map(function esModulePolyfill(dep) {
            if (dep && typeof dep === 'object' && dep.__esModule) {
              return dep.default;
            }
            return dep;
          });
        }
        if (apps.length === length) {
          firing = true;
          cb.apply(global, apps);
          return true;
        }
      };
    }());

    load(mods, referer, customArgs);
    return this;
  };
  /**
   * register module in to cache
   * @param  {string} module    [description]
   * @param  {} exports [description]
   */
  Cube.register = function (module, exports) {
    if (installedModules[module]) {
      return log.error('Cube Error: Module ' + '\'' + module + '\'' + ' already registered');
    }
    installedModules[module] = {
      exports: exports,
      fn: noop,
      loaded: true,
      fired: true
    };
    return this;
  };
  /**
   * @interface inject css into page
   * css inject is comp
   * ie8 and lower only support 32 stylesheets, so this function
   * @param  {String} name module name
   * @param  {CssCode} css  css code
   */
  var parseCssRe = /([^};]+)(\{[^}]+\})/g;
  var cssMod = {};
  Cube.css = function (css, namespace, file) {
    if (!css) {
      return;
    }
    var modId = file + '@' + namespace;
    if (cssMod[modId]) {
      return;
    }
    cssMod[modId] = true;
    if (namespace) {
      css = css.replace(parseCssRe, function (m0, m1, m2) {
        var selectors = m1.split(',').map(function (selector) {
          return namespace + ' ' + selector.trim();
        });
        return selectors.join(',') + m2;
      });
    }
    var style = doc.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('mod', file);
    if (namespace) {
      style.setAttribute('ns', namespace);
    }
    head.appendChild(style);
    style.innerHTML = css;
    return css;
  };


  /* debug */
  Cube.debug = function () {
    if (win.localStorage && win.addEventListener) {
      localStorage.cube = 'debug';
      location.reload();
    } else {
      log.error('Cube Error: Cannot debug, your browser does not support localStorage or addEventListener');
    }
  };

  Cube.cache = function () {
    var unloaded = {}, unfired = {}, i, m;

    for (i in installedModules) {
      if (installedModules.hasOwnProperty(i)) {
        m = installedModules[i];
        if (!m.loaded) {
          unloaded[i] = m;
        }
        if (!m.fired) {
          unfired[i] = m;
        }
      }
    }

    log.info('modules:', installedModules);
    log.info('unloaded:', unloaded);
    log.info('unfired:', unfired);
  };

  if (win.localStorage && localStorage.cube === 'debug') {
    debug = true;
    win.addEventListener('load', Cube.cache);
  }


  alias = alias || 'Cube';
  if (global[alias]) {
    log.error('Cube Error: window.' + alias + ' already in using, replace the last "null" param in cube.js');
  } else {
    global[alias] = Cube;
  }


  /**
   * intergration with <script> tag
   * <script data-base="" src=""></script>
   */
  var cse = doc.currentScript;
  if (cse) {
    var cfg = cse.dataset;
    if (cfg.base) {
      Cube.init(cfg);
      Cube.use(cfg.main || 'index.js', function(app){app.run&& app.run();});
    }
  }

  function parseQueryString(param) {
    let kvs = param.split('&');
    let obj = {};
    kvs.forEach((kv) => {
      let tmp = kv.split('=');
      obj[tmp[0]] = tmp[1];
    });
    return obj;
  }
})(window, null);
