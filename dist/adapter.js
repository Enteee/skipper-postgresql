'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.default = function (options) {
  return new SkipperPostgreSQLAdapter(options);
};

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _knex = require('knex');

var _knex2 = _interopRequireDefault(_knex);

var _PostgresWritableStream = require('./PostgresWritableStream');

var _PostgresWritableStream2 = _interopRequireDefault(_PostgresWritableStream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaults = {
  debug: false,
  pool: {
    min: 2,
    max: 16
  },
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
    port: 5432
  },
  fileTable: 'file'
};

var SkipperPostgreSQLAdapter = function () {
  function SkipperPostgreSQLAdapter() {
    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, SkipperPostgreSQLAdapter);

    this.options = _lodash2.default.defaultsDeep({}, options, defaults);

    this.registerConnection();
  }

  _createClass(SkipperPostgreSQLAdapter, [{
    key: 'registerConnection',
    value: function registerConnection() {
      var _this = this;

      this.knex = (0, _knex2.default)({
        client: 'pg',
        connection: this.options.connection,
        pool: this.options.pool,
        debug: process.env.WATERLINE_DEBUG_SQL || this.options.debug
      });

      return this.knex.schema.hasTable(this.options.fileTable).then(function (exists) {
        if (exists) return;

        return _this.knex.schema.createTable(_this.options.fileTable, function (table) {
          table.text('fd');
          table.text('dirname');
          table.binary('data');
        });
      });
    }
  }, {
    key: 'teardown',
    value: function teardown() {
      return this.knex.destroy();
    }

    /**
     * Read a file from the upstream system (PostgreSQL)
     *
     * @param fd {FileDescriptor}
     */

  }, {
    key: 'read',
    value: function read(options, cb) {
      var fd = _lodash2.default.isObject(options) ? options.fd : options;

      return this.knex(this.options.fileTable).select().where({ fd: fd }).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 1);

        var _ref2$ = _ref2[0];
        var file = _ref2$ === undefined ? {} : _ref2$;

        cb(null, file.data);
        return file.data;
      }).catch(cb);
    }

    /**
     * Remove a file from the upstream system
     *
     * @param fd {FileDescriptor}
     */

  }, {
    key: 'rm',
    value: function rm(fd, cb) {
      return this.knex(this.options.fileTable).where({ fd: fd }).delete().then(function () {
        cb();
      }).catch(cb);
    }

    /**
     * Get the contents of a particular directory on the upstream system
     *
     * @param dirname {FileDescriptor.dirname}
     */

  }, {
    key: 'ls',
    value: function ls(dirname, cb) {
      return this.knex(this.options.fileTable).select(['fd', 'dirname']).where({ dirname: dirname }).then(function () {
        var files = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

        cb(null, files);
        return files;
      }).catch(cb);
    }

    /**
     * Return an "upstream receiver" which will receive files from a stream and
     * pipe them to the upstream system.
     *
     * @return {stream.Writable}
     */

  }, {
    key: 'receive',
    value: function receive() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return new _PostgresWritableStream2.default(options, this);
    }
  }]);

  return SkipperPostgreSQLAdapter;
}();