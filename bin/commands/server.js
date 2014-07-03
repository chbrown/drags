/*jslint node: true */
var cluster = require('cluster');
var logger = require('loge');
var path = require('path');


module.exports = function(argv) {
  /** `server`: Trigger forking cluster + domains code.

  * Utilize all cores on this machine (up to some maximum)
  * Kill off servers when a request throws an unhandled error
  * Restart workers when one goes down.
  * Besides changing how you might report errors, no fun stuff here.
  * Use `worker` for all real controller / action code.
  */
  // var args = [
  //   '--hostname', argv.hostname,
  //   '--port', argv.port,
  //   '--database', argv.database,
  //   '--surveys', argv.surveys,
  // ].concat(argv.verbose ? ['--verbose'] : []);
  // logger.info('Starting %d forks; argv: %s', argv.forks, args.join(' '));

  cluster.setupMaster({
    exec: path.join(__dirname, '..', '..', 'server.js'),
    // args: args,
    // silent: true,
  });

  for (var i = 0; i < argv.forks; i++) {
    var worker = cluster.fork();
    worker.send(argv);
  }
  cluster.on('disconnect', function(worker) {
    logger.error('Worker[%s] died. Forking a new worker.', worker.id);
    var new_worker = cluster.fork();
    new_worker.send(argv);
  });
};
