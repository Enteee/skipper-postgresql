import _ from 'lodash'
import Knex from 'knex'
import hash from 'object-hash'
import deasync from 'deasync'

import PostgresWritableStream from './PostgresWritableStream'

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
    var that = this;
    this.options = _.defaultsDeep({ }, options, defaults)
    this.hash = hash(this.options)
    // try to re-use knex instance
    this.knex = knexes[this.hash]
    if(! this.knex ){
      // create new knex instance
      this.knex = Knex({
        client: 'pg',
        connection: this.options.connection,
        pool: this.options.pool,
        debug: process.env.WATERLINE_DEBUG_SQL || this.options.debug
      });
      // and add data table
      var done = false;
      this.knex.schema.createTableIfNotExists(this.options.fileTable, function (table) {
        table.increments()
        table.string('fd')
        table.string('dirname')
        table.binary('data')
        table.timestamp('createdAt').defaultTo(that.knex.fn.now());
        table.timestamp('updatedAt').defaultTo(that.knex.fn.now());
      }).then(function(){
        done = true;
      }).catch(function(err){
        console.error('Failed creating fileTable: ' + err);
      });
      // wait for completition
      deasync.loopWhile(function(){return !done;});
    }
    knexes[this.hash] = this.knex;
  }

  teardown(){
    // will never be called (ugly!)
    return this.knex.destroy()
  }

  /**
   * Read a file from the upstream system (PostgreSQL)
   *
   * @param fd {FileDescriptor}
   */
  read (options, cb) {
    let fd = _.isObject(options) ? options.fd : options

    return this.knex(this.options.fileTable)
      .select()
      .where({ fd: fd })
      .then(([ file = { }]) => {
        cb(null, file.data)
        return file.data
      })
      .catch(cb)
  }

  /**
   * Remove a file from the upstream system
   *
   * @param fd {FileDescriptor}
   */
  rm (fd, cb) {
    return this.knex(this.options.fileTable)
      .where({ fd: fd })
      .delete()
      .then(() => {
        cb()
      })
      .catch(cb)
  }

  /**
   * Get the contents of a particular directory on the upstream system
   *
   * @param dirname {FileDescriptor.dirname}
   */
  ls (dirname, cb) {
    return this.knex(this.options.fileTable)
      .select([ 'fd', 'dirname' ])
      .where({ dirname: dirname })
      .then((files = [ ]) => {
        cb(null, files)
        return files
      })
      .catch(cb)
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

export default function (options) {
  return new SkipperPostgreSQLAdapter(options)
}
