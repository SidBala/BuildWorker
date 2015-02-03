
// CoreOS always uses this ip for the host ip.
var COREOS_ETCD_ENDPOINT = '172.17.42.1';
var COREOS_ETCD_PORT = '4001';

var Etcd = require('node-etcd');
var etcd = new Etcd(COREOS_ETCD_ENDPOINT, COREOS_ETCD_PORT);

etcd.set("key", console.log);
etcd.set("key", "value", console.log);