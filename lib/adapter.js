const _ = require('lodash');
const Knex = require('knex');
const hash = require('object-hash');

const PostgresWritableStream  = require('./PostgresWritableStream');

const defaults = {
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
}

const knexes = {};

class SkipperPostgreSQLAdapter {

  constructor (options = { }) {
    this.options = _.defaultsDeep({ }, options, defaults)
    this.hash = hash(this.options)
    // try to re-use knex instance
    this.knex = knexes[this.hash]
    if(!this.knex){
      // create new knex instance
      this.knex = Knex({
        client: 'pg',
        connection: this.options.connection,
        pool: this.options.pool,
        debug: process.env.WATERLINE_DEBUG_SQL || this.options.debug
      });
    }
    knexes[this.hash] = this.knex;
  }

  prepareSchema(cb) {
    // add data table
    knex.schema.hasTable(this.options.fileTable)
    .then(
      (exists) => {
        if (exists) return cb();
        return this.knex.schema.createTable(
          this.options.fileTable,
          (table) => {
            table.increments();
            table.string('fd');
            table.string('name');
            table.string('dirname');
            table.binary('data');
            table.timestamp('createdAt').defaultTo(this.knex.fn.now());
            table.timestamp('updatedAt').defaultTo(this.knex.fn.now());
          }
        )
        .then(() => cb(null))
        .catch(cb);
      }
    );
  }

  /**
   * Read a file from the upstream system (PostgreSQL)
   *
   * @param fd {FileDescriptor}
   */
  read (options, cb) {
    let fd = _.isObject(options) ? options.fd : options
    this.prepareSchema((err) => {
      if(err) return cb(err);
      return this.knex(this.options.fileTable)
        .select()
        .where({ fd: fd })
        .then(([ file = { }]) => {
          cb(null, file.data)
          return file.data
        })
        .catch(cb)
    });
  }

  /**
   * Remove a file from the upstream system
   *
   * @param fd {FileDescriptor}
   */
  rm (fd, cb) {
    this.prepareSchema((err) => {
      if(err) return cb(err);
      return this.knex(this.options.fileTable)
        .where({ fd: fd })
        .delete()
        .then(() => {
          cb()
        })
        .catch(cb)
    });
  }

  /**
   * Get the contents of a particular directory on the upstream system
   *
   * @param dirname {FileDescriptor.dirname}
   */
  ls (dirname, cb) {
    this.prepareSchema((err) => {
      if(err) return cb(err);
      return this.knex(this.options.fileTable)
        .select([ 'fd', 'dirname' ])
        .where({ dirname: dirname })
        .then((files = [ ]) => {
          cb(null, files)
          return files
        })
        .catch(cb);
    });
  }

  /**
   * Return an "upstream receiver" which will receive files from a stream and
   * pipe them to the upstream system.
   *
   * @return {stream.Writable}
   */
  receive (options = { }) {
    return new PostgresWritableStream(options, this)
  }
}

module.exports = (options) => new SkipperPostgreSQLAdapter(options);
