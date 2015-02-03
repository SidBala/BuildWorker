
// CoreOS always uses this ip for the host ip.
var COREOS_ETCD_ENDPOINT = '172.17.42.1';
var COREOS_ETCD_PORT = '4001';

var BEANSTALK_WORKTUBE_NAME = 'work';
var BEANSTALK_RESULTTUBE_NAME = 'result';

var Etcd = require('node-etcd');
var fivebeans = require('fivebeans');

var log = require('log-colors');
var etcd = new Etcd(COREOS_ETCD_ENDPOINT, COREOS_ETCD_PORT);

// Set this to true if you want to locally spin up beanstalk
var autodiscoverBeanstalkd = true;
var localBeanstalkEndpoint = 'localhost';

if(autodiscoverBeanstalkd) {
    // Connect to etcd and retrieve the beanstalkd endpoint ipaddr
    etcd.get("/beanstalkd", function(err, result) {
        if (err) {
            // Key is not set yet
            if (err.errorCode == 100)
            {
                // In this case, we watch for the key to be set
                log.error("Key not set yet - Beanstalk is probably not running. Will wait on it");
                
                etcd.watch('/beanstalkd', function(err, result) {
                    var beanstalkEndpoint = result.node.value ;
                    log.debug('Found beanstalkd instance at ' + beanstalkEndpoint);
                    connectToQueuesAndStartWorking(beanstalkEndpoint);
                });
            }
        }
        else
        {
            var beanstalkEndpoint = result.node.value ;
            log.debug('Found beanstalkd instance at ' + beanstalkEndpoint);
            connectToQueuesAndStartWorking(beanstalkEndpoint);
        }
    });
} else {
    connectToQueuesAndStartWorking(localBeanstalkEndpoint);
}

var jobClient;
var resultClient;

function connectToQueuesAndStartWorking (endpoint) {
    jobClient = new fivebeans.client(endpoint, 11300);
    resultClient = new fivebeans.client(endpoint, 11300);
    jobClient
        .on('connect', function()
        {
            log.debug('Job Tube connected successfully');
            jobClient.watch(BEANSTALK_WORKTUBE_NAME, function(err, numwatched) {
                jobClient.reserve(function(err, jobid, payload) {
                    if(!err) {
                        processJob(jobid, payload, jobClient);
                    }
                });
            });
        })
        .connect();

    resultClient
        .on('connect', function()
        {
            log.debug('Result Tube connected successfully');
            resultClient.use(BEANSTALK_RESULTTUBE_NAME, function(err, tubename) {
                // TODO: Synchronize such that this happens before any jobs are done
            });
        })
        .connect();
}

// Dummy job here for now
// Simply wait some random amount between 0 - 10 seconds and then mark the job as done
function processJob (jobId, jobPayload, client) {
    log.debug("Working on: " + jobId);
    setTimeout( function () {
        client.destroy(jobId, function(err) {
            log.debug("Done with: " + jobId);

            postResult("Done with Job: " + jobId);
        });        
    },
    Math.floor(Math.random() * 10 * 1000));
}

function postResult (resultPayload, client) {

    resultClient.put(0, 999, 0, resultPayload, function(err, jobid) {
        if(err) {
            log.error(err);
        }
    });
}



