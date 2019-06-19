const _ = require('lodash');
const Writable = require('stream').Writable;
const path = require('path');

class PostgresWritableStream extends Writable {

  /**
   * @override
   * https://nodejs.org/api/stream.html#stream_constructor_new_stream_writable_options
   */
  constructor (streamOptions, adapter) {
    super(_.defaults({ objectMode: true }, streamOptions))
    this.adapter = adapter
  }

  /**
   * @override
   * https://nodejs.org/api/stream.html#stream_writable_write_chunk_encoding_callback_1
   *
   * @param file {Buffer}
   * @param encoding {null}
   * @param cb {Function}
   */
  _write (file, encoding, cb) {

    // `skipperFd` is the file descriptor-- the unique identifier.
    // Often represents the location where file should be written.
    //
    // But note that we formerly used `fd`, but now Node attaches an `fd` property
    // to Readable streams that come from the filesystem.  So this kinda messed
    // us up.  And we had to do this instead:
    const skipperFd = file.skipperFd || (_.isString(file.fd)? file.fd : undefined);
    if (!_.isString(skipperFd)) {
      return cb(new Error('In skipper-disk adapter, write() method called with a stream that has an invalid `skipperFd`: '+skipperFd));
    }

    //if (!file.byteCount) {
    //  file.byteCount = file._readableState.length
    //}

    // buffer all data and write to database once
    // the stream ends.
    const bufs = [];
    file.on('data', (d) => bufs.push(d));
    file.on('end',
      () => this.adapter.prepareSchema((err) => {
          if(err) return cb(err);
          return this.adapter.knex(this.adapter.options.fileTable)
            .insert({
              fd: skipperFd,
              name: file.filename,
              dirname: file.dirname || path.dirname(file.filename),
              data: Buffer.concat(bufs)
            })
            .returning([ 'fd', 'dirname' ])
            .then((newFile) => cb())
            .catch(cb);
      })
    );

  }
}

module.exports = PostgresWritableStream;
