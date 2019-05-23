Cube
=================

![logo](https://raw.github.com/fishbar/cube/master/logo.png)

模块化你的前端代码，像node.js一样编写模块。

Cube管理着前端三种类型的资源:

* script js/coffee/jsx/...
* style css/stylus/less/...
* template html/ejs/jade/...

[![Build Status](https://travis-ci.org/node-cube/cube.svg)](https://travis-ci.org/node-cube/cube)
[![NPM version](https://badge.fury.io/js/node-cube.svg)](http://badge.fury.io/js/node-cube)

## Install

```sh
npm install -g node-cube
```

安装完成之后，命令行增加一个命令 `cube`

## Getting Start (6 steps)

1. 初始化cube:

在node工程的root目录下，安装node-cube:

```sh
> npm install -D node-cube
```

2. 在server中挂载cube middleware

```
const app = require('express')();
const Cube = require('node-cube');
let cubeM = Cube.middleware({
  root: path.join(__dirname, '../assets')
});
app.use('/assets', cubeM);
```

cubeM支持静态服务，所以设置完之后，整个assets目录即可被访问。

3. 初始化前端html（通常在node后端模板中）

```
<!-- cube.js由cubeM中间件提供，是个虚拟文件，assets目录下没有，也无需有；cube build时会自动生成 -->
<script src='/assets/cube.js'></script>
<script>
  /** init cube, tell cube where to load modules */
  Cube.init({
    base: '/assets',
    debug: true,
    version: 12345
  });
  /** 
   * start loading main.js and run it
   * 下面的use方法将根据上面初始化设置的base作为根地址，加载所有依赖的文件
   *  '/main.js' 意味着访问到 assets/main.js
   */
  Cube.use('/main.js', function (App) {
    console.log(App.run({
      /** config object here */
    }));
  });
</script>
```

4. 配置cube支持前端的各种脚本编译方式

cube有很多种配置方式，但是推荐使用如下方式：在assets/package.json中编写配置项

assets/package.json通常管理着前端的所有依赖，配置在cube段的config，在cube开发模式和`cube build`时都会来读取这份配置，配置在此可以保证build的时候和开发模式配置一致。

```
{
  "cube": {
    "moduleMap": {
      /**
       * 有些编译好的模块，可以通过映射来加速
       */
      "react": "dist/react.js",
      "modulemap": "lib/index.js"
    },
    "processors": {
      ".less": "cube-less",
      /**
       * 支持本地自定义processor, 其路径可以是相对路径（相对package.json的路径）
       * 也可以是绝对路径
       */
      ".tpl": "../custom_processor",
      /**
       * 支持配置process参数
       */
      ".jsx": [
        ["cube-babel", {}]
      ],
    }
  },
  ignoreRules: []
}
```

其中：
* `moduleMap` 为一些已经build成single-file的模块提供filemap，以加速加载
* `processors` 对象定义各种文件的处理器
* `ignoreRules` 中定义build时的忽略规则，和`.cubeignore`功能类似
* `export` 定义需要被导出的文件，补充自动识别导出文件的不足

ok, 到此cube初始化完毕，可以像编写node.js一样编写前端代码了。

5. 编写前端代码

```js
// main.js
var cookie = require('cookie');
var tpl = require('./test.html');

function  init() {
  // init layout
  $('body .main').html(tpl());
  // get nick
  var nick = cookie.get('nick');
  if (!nick) {
    nick = 'guest';
  }
  $('.node-nick').text(nick);
}
init();
// 异步加载css
load('../css/module.css', nameSpace); // namespace [optional]: prefix for css selector
```

ok，一个很简单的一个模块，`index.html`加载了main.js，便开始执行：设置头部用户登录昵称

Cube的模块加载是支持像node一样寻址node_modules目录的，在wwwroot目录下安装模块，可以被直接require使用， 所以可以把稳定的代码模块，发布到npm仓库实现代码复用

引用现有的包， 你只需要

  * 编写好package依赖
  * `npm install`  注意这里的`npm install`是安装在静态资源目录，不是工程根目录。
  * 像node一样引用这些模块

注意node_modules，虽然和node.js的模块一模一样使用，但是它们安装在不同的地方。
前端工程里使用到的模块，需要安装在静态资源目录下，如下结构：

```sh
/project
        /assets
              /node_modules   # client side node_modules
              /common
              /css
              - package.json  # 前端所依赖的模块声明
        /lib
        /controller
        /node_modules         # server side node_modules
        - package.json        # 后端所依赖的模块申明
```

6. build代码, release成静态代码

完成开发之后，模块都会被预编译、压缩成一个个小文件，合并，然后发布到线上(cdn服务器、云存储 或 其他)

cube提供build命名来方便的完成这一任务
```sh
# build static folder
cube build $resource_path -o $resource_path.release --smart --mangle-file-name
```

`cube build`的参数:
```
    -h, --help             output usage information
    -o, --output [value]   set the output dir
    --output-file [value]  set the output file
    -b, --base [value]     the http base for resouce 
    -r, --root [value]     setup project base dir, the root
    --remote [value]       set the namespace for remote call
    --export [value]       files will be exported, do not merge, example: /a.js,/b.js
    --mangle-file-name     mangle the file name into random name
    --without-compress     do not compress code
    --without-wrap         do not wraper code
    --smart                smart build, only build necessary files
```

在静态资源目录下，编写 `.cubeignore`来排除不需要被处理的文件，格式和.gitignore类似：

```
[skip]
/node_modules/jquery/jquery.min.js
[ignore]
/node_modules/.bin
```
- 匹配`skip`段的文件，将跳过编译，直接copy到目标目录
- 匹配`ignore`段的文件，将直接忽略，build之后不会出现在目标目录中

不添加标记的时候，默认都为skip, 例如：
```
/test/
```
cube 在build的时候将直接copy文件，而不会build代码

.cubeignore 文件的寻址 会从build目录开始逐级往上寻找，直到找到为止


### 浏览器端API

```
/**
 * 开启debug模式, 会打印模块加载调试信息
 * @static
 */
Cube.debug();

/**
 * 初始化
 * @static
 * @param options {Object}
 *   charset {String} script标签
 *   base {String} 服务器端模块的http前缀地址
 *   debug {Boolean} 是否开启debug
 *   version {Number} 静态资源版本号，刷缓存用
 *   timeout {Number} 加载脚本超时时间
 *   remoteBase：{Object} 远程模块库映射
 */
Cube.init(options);

/**
 * 异步加载模块，带回调，页面的主入口一般就这个写法
 * @static
 * 注意module传入的寻址规则， 以下规则等效，都是基于 base 根目录下
 *    /app.js
 *    ./app.js
 *    app.js
 */
Cube.use(module, cb);
Cube.use([mod1, mod2], function(mod1, mod2) {
  // TODO: your code here
});

/**
 * 注册页面已通过script标签加载过的模块，避免重复加载
 * @static
 * 如下，注册 jquery， lodash
 * 注意后端assets目录下，请不要安装这些模块
 */
Cube.register('jquery', $);
Cube.register('lodash', _);
```


* 注意 Cube.use 传入的参数寻址，基于当前 init的时候指定的base， 即跟目录下

```
Cube.use('/app.js', cb);
Cube.use('./app.js', cb);
Cube.use('app.js', cb);
```
以上是等效的，都引用了主类目下的  app.js 模块

* cube支持remote源的模式

```
Cube.init({
  remoteBase：{
    test: 'http://test.com/assets'
  }
});
```

当test.com的assets发布的时候设置了`cube build --remote=test`, 模块都会被设置一个remote命名空间，这样的remoteBase只要命名空间不冲突，可以实现站点间模块共享。


### 服务器端API

服务器端cube提供两种模式： 1. middleware模式, 2. 独立初始化 3. 命令行工具

* middlware 模式

```
const Cube = require('node-cube');
let cube = Cube.middleware({
  /**
   * 静态资源的绝对路径
   * @type {String}
   */
  root: ''
  /**
   * 端口
   * @type {Number}
   */
  port: 8080,
  /**
   * 是否middleware模式
   * @type {Boolean}
   */
  middleware: true,
  /**
   * 所有资源文件（如css中图片）的http前缀路径,
   * 一般是一个站点的绝对路径`/`，或者`http://`完整路径
   * @type {String}
   */
  base: '/',
  /**
   * 编辑模式下，缓存目录，默认在 $root/.cubecache
   */
  cacheDir： '',
  /**
   * 浏览器端文件缓存时间，最终会应用到http头：Cache-Control: public, maxAge=xxx
   * @type {Number}
   */
  maxAge: 600
  /**
   * 配置文件的处理器 processors
   * 这个配置更推荐在 package.json的 cube 属性中配置，这样build和debug的时候同时生效
   * @type {Object}
   */
  processors: {
    '.jsx': [
      ['cube-react', {}],  // processor with config
      'minify'
    ],                     // multi-processor
    '.jsw': 'jsw'          // single processor
  },
  /**
   * 开发模式下是否开启缓存， 默认开启
   * @type {Boolean}
   */
  devCache: true,

  optimize: true  // optimize file load, default is true
});
```

* 独立初始化

```
const Cube = require('node-cube');
let cube = new Cube(options);
```

* cli模式

```sh
# 本地开发的时候启动服务，指定静态文件目录，即可服务起来
> cube start your_project_dir

# 初始化工程, 初始化一个简单的case
> cube init dir

# 打包发布工程
> cube build dir
```

## 配置优先级


构造函数传入 > package.json > cube内置配置

* processors 优先级

  构造函数传入  > package.json中配置 > cube默认配置

* ignoreRule 优先级

  ignoreRule的配置同等优先级，merge之后都会生效

  构造函数 = .cubeignore = package.json

## Customize Cube Processors

一个典型的插件代码: 

```
var path = require('path');
/**
 * 构造函数
 * @param {Cube} cube Cube instance
 */
function CustomProcessor(cube) {
	this.cube = cube;
}
CustomProcessor.type = 'style';
CustomProcessor.ext = ['.sass'];
CustomProcessor.prototype.process = function (data, options, callback) {
	/**
   * 在这个函数中处理data对象，data.code已经拿到了源文件，例如less的处理
   * 就是将data.code编译成css，然后重新赋值回data.code。
   *  data {Object} 
   *    queryPath
   *    realPath
   *    code
   *    source
   */
	callback(null, data);
};
module.exports = CustomProcessor;

```

可参考目前已有的processor源码，来更快的理解自定义processor。
