const spawn = require('child_process').spawn;
const {
    Readable
} = require('stream');

function quote(val) {
    // escape and quote the value if it is a string and this isn't windows
    if (typeof val === 'string' && process.platform !== 'win32') {
        val = '"' + val.replace(/(["\\$`])/g, '\\$1') + '"';
    }

    return val;
}

function commandWrapper(input, options, callback) {
    commandWrapper.stdout = '';
    if (!options) {
        options = {};
    } else if (typeof options == 'function') {
        callback = options;
        options = {};
    }

    var args = commandWrapper.command.split(' ');
    var keys = Object.keys(options);
    keys.forEach(function (key) {
        var val = options[key];
        if (key === 'ignore' || key === 'debug' || key === 'getStdOut') { // skip adding the ignore/debug keys
            return false;
        }

        if (Array.isArray(val)) { // add repeatable args
            val.forEach(function (valueStr) {
                args.push(key);
                if (Array.isArray(valueStr)) { // if repeatable args has key/value pair
                    valueStr.forEach(function (keyOrValueStr) {
                        args.push(quote(keyOrValueStr));
                    });
                } else {
                    args.push(quote(valueStr));
                }
            });
        } else { // add normal args
            if (val !== false) {
                args.push(key);
            }

            if (typeof val !== 'boolean') {
                args.push(quote(val));
            }
        }
    });

    // show the command that is being run if debug opion is passed
    if (options.debug && !(options instanceof Function)) {
        console.log('[commandWrapper] [debug] [command] ' + args.join(' '));
    }

    if (process.platform === 'win32') {
        var child = spawn(args[0], args.slice(1));
    } else if (process.platform === 'darwin') {
        var child = spawn('/bin/sh', ['-c', 'set -o pipefail ; ' + args.join(' ') + ' | cat']);
    } else {
        var child = spawn(commandWrapper.shell, ['-c', 'set -o pipefail ; ' + args.join(' ') + ' | cat']);
    }

    var stream = child.stdout;

    // call the callback with null error when the process exits successfully
    child.on('exit', function (code) {
        if (code !== 0) {
            stderrMessages.push('commandWrapper for ' + commandWrapper.command + ' exited with code ' + code);
            handleError(stderrMessages);
        } else if (callback) {
            callback(null, stream); // stream is child.stdout
        }
    });

    // setup error handling
    var stderrMessages = [];

    function handleError(err) {
        var errObj = null;
        if (Array.isArray(err)) {
            // check ignore warnings array before killing child
            if (options.ignore && options.ignore instanceof Array) {
                var ignoreError = false;
                options.ignore.forEach(function (opt) {
                    err.forEach(function (error) {
                        if (typeof opt === 'string' && opt === error) {
                            ignoreError = true;
                        }
                        if (opt instanceof RegExp && error.match(opt)) {
                            ignoreError = true;
                        }
                    });
                });
                if (ignoreError) {
                    return true;
                }
            }
            errObj = new Error(err.join('\n'));
        } else if (err) {
            errObj = new Error(err);
        }
        child.removeAllListeners('exit');
        child.kill();
        // call the callback if there is one

        if (callback) {
            callback(errObj);
        }

        // if not, or there are listeners for errors, emit the error event
        if (!callback || stream.listeners('error').length > 0) {
            stream.emit('error', errObj);
        }
    }

    child.once('error', function (err) {
        throw new Error(err); // critical error
    });

    child.stderr.on('data', function (data) {
        stderrMessages.push((data || '').toString());
        if (options.debug instanceof Function) {
            options.debug(data);
        } else if (options.debug) {
            console.log('[commandWrapper] [debug] ' + data.toString());
        }
    });

    if (options.getStdOut) {
        child.stdout.on('data', function (data) {
            if (options.debug instanceof Function) {
                options.debug(data);
            } else if (options.debug) {
                commandWrapper.stdout += data.toString();
                stream = Readable.from([commandWrapper.stdout]);
                console.log('[commandWrapper] [getStdOut] ' + commandWrapper.stdout);
            }
        });
    }
    child.stdin.end(input);

    // return stdout stream so we can pipe
    return stream;
}

commandWrapper.command = 'loginctl';
commandWrapper.shell = '/bin/bash';
module.exports = commandWrapper;