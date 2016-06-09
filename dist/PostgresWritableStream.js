'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stream = require('stream');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class PostgresWritableStream extends _stream.Writable {

  /**
   * @override
   * https://nodejs.org/api/stream.html#stream_new_stream_writable_options
   */
  constructor(streamOptions, adapter) {
    super(_lodash2.default.defaults({ objectMode: true }, streamOptions));
    this.Adapter = adapter;
  }

  /**
   * @override
   * https://nodejs.org/api/stream.html#stream_class_stream_writable_1
   *
   * @param file {Buffer}
   * @param encoding {null}
   * @param cb {Function}
   */
  _write(file, encoding, cb) {
    if (!file.byteCount) {
      file.byteCount = file._readableState.length;
    }
    return this.Adapter.knex(this.Adapter.options.fileTable).insert({
      data: Buffer.concat(file._readableState.buffer),
      fd: file.fd,
      dirname: file.dirname || _path2.default.dirname(file.fd)
    }).returning(['fd', 'dirname']).then(newFile => {
      this.end();
      cb();
    }).catch(err => {
      this.emit('error', err);
      this.end();
      cb(err);
    });
  }
}
exports.default = PostgresWritableStream;