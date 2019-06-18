const _ = require('lodash');
const Writable = require('stream').Writable;
const path = require('path');

class PostgresWritableStream extends Writable {

  /**
   * @override
   * https://nodejs.org/api/stream.html#stream_new_stream_writable_options
   */
  constructor (streamOptions, adapter) {
    super(_.defaults({ objectMode: true }, streamOptions))
    this.adapter = adapter
  }

  /**
   * @override
   * https://nodejs.org/api/stream.html#stream_class_stream_writable_1
   *
   * @param file {Buffer}
   * @param encoding {null}
   * @param cb {Function}
   */
  _write (file, encoding, cb) {
    if (!file.byteCount) {
      file.byteCount = file._readableState.length
    }
    this.adapter.prepareSchema((err) => {
      if(err) return cb(err);
      return this.adapter.knex(this.adapter.options.fileTable)
        .insert({
          fd: file.fd,
          dirname: file.dirname || path.dirname(file.fd),
          data: Buffer.concat(file._readableState.buffer)
        })
        .returning([ 'fd', 'dirname' ])
        .then(newFile => {
          cb()
        })
        .catch(cb);
    });
  }
}

module.exports = PostgresWritableStream;
