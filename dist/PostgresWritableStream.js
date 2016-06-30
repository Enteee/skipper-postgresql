'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _stream = require('stream');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var PostgresWritableStream = function (_Writable) {
  _inherits(PostgresWritableStream, _Writable);

  /**
   * @override
   * https://nodejs.org/api/stream.html#stream_new_stream_writable_options
   */

  function PostgresWritableStream(streamOptions, adapter) {
    _classCallCheck(this, PostgresWritableStream);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(PostgresWritableStream).call(this, _lodash2.default.defaults({ objectMode: true }, streamOptions)));

    _this.adapter = adapter;
    return _this;
  }

  /**
   * @override
   * https://nodejs.org/api/stream.html#stream_class_stream_writable_1
   *
   * @param file {Buffer}
   * @param encoding {null}
   * @param cb {Function}
   */


  _createClass(PostgresWritableStream, [{
    key: '_write',
    value: function _write(file, encoding, cb) {
      if (!file.byteCount) {
        file.byteCount = file._readableState.length;
      }
      return this.adapter.knex(this.adapter.options.fileTable).insert({
        fd: file.fd,
        dirname: file.dirname || _path2.default.dirname(file.fd),
        data: Buffer.concat(file._readableState.buffer)
      }).returning(['fd', 'dirname']).then(function (newFile) {
        cb();
      }).catch(cb);
    }
  }]);

  return PostgresWritableStream;
}(_stream.Writable);

exports.default = PostgresWritableStream;