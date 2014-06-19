/*!
 * cube: test/index.js
 * Authors  : = <=> (https://github.com/fishbar)
 * Create   : 2014-04-18 15:32:20
 * CopyRight 2014 (c) Fish And Other Contributors
 */
var expect = require('expect.js');
var testMod = require('../index');
var path = require('path');
var request = require('supertest');
testMod.init({
  root: path.join(__dirname, '../example'),
  port: 7777,
  router: '/a/b/'
});
request = request('http://localhost:7777');
describe('index.js', function () {
  describe('query js files', function () {
    it('should return regular js file', function (done) {
      request.get('/a/b/js/jquery.js')
        .expect(200)
        .expect('content-type', 'application/javascript')
        .expect(/^(?!Cube\()/, done);
    });
    it('should return transfered js file', function (done) {
      request.get('/a/b/js/index.js?m')
        .expect(200)
        .expect('content-type', 'application/javascript')
        .expect(function (res) {
          var body = res.text;
          expect(body).to.match(/require\('\/js\/jquery\.js'\)/);
          expect(body).to.match(/Cube\("\/js\/index\.js"/);
        })
        .end(done);
    });
    it('should return transfered coffee file', function (done) {
      request.get('/a/b/js/test_coffee.coffee?m')
        .expect(200)
        .expect('content-type', 'application/javascript')
        .expect(function (res) {
          var body = res.text;
          expect(body).to.match(/var a/);
          expect(body).to.match(/Cube\("\/js\/test_coffee\.coffee"/);
        })
        .end(done);
    });

    it('should return a merge file with @merge', function (done) {
      request.get('/a/b/js/merge.js?m')
        .expect(200)
        .expect('content-type', 'application/javascript')
        .expect(function (res) {
          var body = res.text;
          var fn = wrapCode(body);
          var M = fn();
          expect(M['/js/merge.js'].run()).to.match(/jquery running/);
          expect(body).to.match(/Cube\("\/js\/jquery\.js/);
          expect(body).to.match(/Cube\("\/js\/merge\.js/);
        })
        .end(done);
    });
    it('should return a compress file', function (done) {
      request.get('/a/b/js/index.js?m&c')
        .expect(200)
        .expect('content-type', 'application/javascript')
        .expect(function (res) {
          var body = res.text;
          expect(body).to.match(/Cube\("\/js\/index\.js/);
          expect(body).not.match(/\/\*\!/);
          expect(body).not.match(/module/);
        })
        .end(done);
    });
    it('should return a compress file with @merge flag', function (done) {
      request.get('/a/b/js/merge.js?m&c')
        .expect(200)
        .expect('content-type', 'application/javascript')
        .expect(function (res) {
          var body = res.text;
          var fn = wrapCode(body);
          var M = fn();
          expect(M['/js/merge.js'].run()).to.match(/jquery running/);
          expect(body).to.match(/Cube\("\/js\/jquery\.js/);
          expect(body).to.match(/Cube\("\/js\/merge\.js/);
        })
        .end(done);
    });
    it('should return 404 when file not found', function (done) {
      request.get('/a/b/js/jquery-notfound.js?m')
        .expect(404)
        .expect(/module not found/, done);
    });
    it('should return 500 when file parse ast error', function (done) {
      request.get('/a/b/js/error.js?m')
        .expect(500)
        .expect(function (res) {
          expect(res.text).match(/js parse error/ig);
        })
        .end(done);
    });
    it('should return 500 when file cycle require', function (done) {
      request.get('/a/b/js/cycle_server/a.js?m&c')
        .expect(200)
        .expect(function (res) {
          var requires = res.text.split('\n');
          expect(requires.length).to.be(3);
        })
        .end(done);
    });
    it('should return ok when file require node_modules', function (done) {
      request.get('/a/b/js/node_modules_test.js?m')
        .expect(200)
        .expect(function (res) {
          expect(res.text).to.match(/\/node_modules\/test\/lib\/a\.js/);
          expect(res.text).to.match(/\/node_modules\/test\/lib\/b\.js/);
          expect(res.text).to.match(/\/node_modules\/test\/a\.js/);
        })
        .end(done);
    });
    it('should return 404 when file require node_modules not exist', function (done) {
      request.get('/a/b/js/node_modules_not_found.js?m')
        .expect(404)
        .expect(function (res) {
          expect(res.text).to.match(/required module not found/);
        })
        .end(done);
    });
  });

  describe("query css file", function () {
    it('should return a transfered css file', function (done) {
      request.get('/a/b/css/test.css')
        .expect(200)
        .expect(function (res) {
          expect(res.text).match(/\.test \{/ig);
        })
        .end(done);
    });
    it('should return a transfered comressed css file', function (done) {
      request.get('/a/b/css/test.css?c')
        .expect(200)
        .expect(function (res) {
          expect(res.text).match(/\.test\{/ig);
        })
        .end(done);
    });

    it('should return a transfered less file', function (done) {
      request.get('/a/b/css/test.less')
        .expect(200)
        .expect(function (res) {
          expect(res.text).match(/\.box a \{/ig);
        })
        .end(done);
    });
    it('should return a transfered compressed less file', function (done) {
      request.get('/a/b/css/test.less?c')
        .expect(200)
        .expect(function (res) {
          expect(res.text).match(/\.box a\{/ig);
          expect(res.text).not.match(/\n/);
        })
        .end(done);
    });

    it('should return a transfered sass file', function (done) {
      request.get('/a/b/css/test.sass')
        .expect(200)
        .expect(function (res) {
          expect(res.text).match(/\.test a \{/ig);
        })
        .end(done);
    });
    it('should return a transfered compressed sass file', function (done) {
      request.get('/a/b/css/test.sass?m&c')
        .expect(200)
        .expect(function (res) {
          expect(res.text).match(/\.test a\{/ig);
          expect(res.text).not.match(/\n/);
        })
        .end(done);
    });

    it('should return a transfered styl file', function (done) {
      request.get('/a/b/css/test.styl?m')
        .expect(200)
        .expect(function (res) {
          expect(res.text).match(/\.test a \{/ig);
        })
        .end(done);
    });

    it('should return a transfered styl file', function (done) {
      request.get('/a/b/css/test.styl?m&c')
        .expect(200)
        .expect(function (res) {
          expect(res.text).match(/\.test a\{/ig);
          expect(res.text).not.match(/\n/);
        })
        .end(done);
    });
  });

  describe('query tpl file', function () {
    it('should return a compiled ejs file', function (done) {
      request.get('/a/b/tpl/test.ejs?m')
        .expect(200)
        .expect(function (res) {
          var code = res.text;
          expect(code).match(/^Cube\(/);
        }).end(done);
    });
    it('should return a compiled jade file', function (done) {
      request.get('/a/b/tpl/test.jade?m')
        .expect(200)
        .expect(function (res) {
          var code = res.text;
          expect(code).match(/^Cube\(/);
        }).end(done);
    });
  });
});

function wrapCode(code) {
  var header = '\
    var M = {}; \
    function require(name) {return M[name]};\
    function Cube(mo, requires, cb){\
      var module = {exports: {}}; \
      M[mo] = cb(module, module.exports, require);\
    }\n';
  var footer = '\nreturn M;';
  var fn = new Function(header + code + footer);
  return fn;
}
