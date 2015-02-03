// Use this to inject some random jobs into the workqueue

var log = require('log-colors');
var beanstalk = require('fivebeans');
var Promise = require('bluebird');
var os = require('os');
var util = require('util');
 
var Hash = require ('hashids');
var hash = new Hash('Thiz iz mah salt');
 
var numJobs = process.argv[2] || 1;
 
log.debug('# of Jobs to inject: ' +  numJobs);
 
var config =
    {
        // Master that runs beanstalkd
        'MasterIP' : '54.149.127.111',
        'MasterPort' : 11300,
           
        // # of instances to spin up for each CPU core on the machine
        'ProcMult' : 2,
 
        // # of instances to cap out on this machine
        'MaxProc' : 10
    };

var jobClient;
var resultClient;
 
var jobTubePromise = new Promise (function(res, rej) {
    jobClient = new beanstalk.client(config.MasterIP, config.MasterPort);
    jobClient
    .on('connect', function() {
        jobClient.use('work', function(err, numWatched) {
 
            if(err) {
                return log.error(err);
            }
            log.debug("Connected to Work Tube");
            res();
        });
    })
    .on('error', function(err) {
        rej(err)
    }).connect();
});

var resultTubePromise = new Promise (function(res, rej) {
    resultClient = new beanstalk.client(config.MasterIP, config.MasterPort);
    resultClient
    .on('connect', function() {
        resultClient.watch('result', function(err, numWatched) {
 
            if(err) {
                return log.error(err);
            }
            log.debug("Connected to Result Tube");
            res();
        });
    })
    .on('error', function(err) {
        rej(err)
    }).connect();
});

Promise.all([jobTubePromise, resultTubePromise]).then(function() {
    log.debug('Connected to Beanstalkd');
 
    //Put some  jobs in the tubes
    for(var i=0; i < numJobs; i++) {
        // Generate some random payloads.
        // These payloads will be strings.
        var payload = hash.encode(parseInt(Math.random() * 1000));
        (function() {
            var thePayload = payload;

            // Put the job into the tube
            jobClient.put(
               0,   // Priority
               0,   // Delay. 0 = start immediately
             120,   // Timeout. 2 minutes.
        thePayload,   // Some random payload
            function(err, jobID) {
                  if(err) return log.error(err);
                  log.debug('Injected : ' + jobID + ' | payload: ' + thePayload);
            });
        })();
    }

}).then(function() {
    // Here we start pulling jobs out of the result queue and display them.
    function pullNextResult () {
        resultClient.reserve(function(err, jobid, payload) {
            log.info("Got result: " + jobid + " | payload: " + payload);
            resultClient.destroy(jobid, function(err) {
                setImmediate(pullNextResult);
            });
        });
    }
    pullNextResult();
});