

"use strict";

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils
var hilink = require('hilinkhuawei');

var adapter = utils.adapter('hilink');


adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    //adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    //adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));



    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {


        adapter.log.info('ack is not set!');
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj == 'object' && obj.message) {
        if (obj.command == 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});


function setHilink (setid, response ) {
    for (var key in response.response) {
        var val = response.response[key];
        adapter.setObject(setid+'.'+key, {
            type: 'state',
            common: {
                name: key,
                type: 'mixed',
                role: 'indicator',
                "read": "true",
                "write": "false"
            },
            native: {}
        });
        adapter.setState(setid+'.' + key, {val: val, ack: true});
    }
}

function timeStatus() {

    hilink.smsCount(function( response ){
        setHilink("smscount",response);
    });

    hilink.statusNet(function( response ){
        setHilink("status.net",response);
    });


    hilink.status(function( response ){
        setHilink("status.status",response);
    });

    hilink.signal(function( response ){
        setHilink("status.signal",response);
    });
    ;
}


function timeTraffic() {

    hilink.traffic(function( response ){
        setHilink("traffic.total",response);
    });

    hilink.trafficMonth(function( response ){
        setHilink("traffic.month",response);
    });
}


setInterval(timeStatus, 60000);
setInterval(timeTraffic, 10000);



function main() {
    adapter.log.info('config getip: ' + adapter.config.getip);
    adapter.log.info('config trafficInfo: ' + adapter.config.trafficInfo);
    adapter.log.info('config settime: ' + adapter.config.settime);
    adapter.log.info('config setTest: ' + adapter.config.setTest);
    hilink.setIp(adapter.config.getip);
    hilink.setTrafficInfo(adapter.config.trafficInfo);
/*
    adapter.subscribeStates('*');

    adapter.setState('testVariable', true);

    adapter.setState('testVariable', {val: true, ack: true});

    adapter.setState('testVariable', {val: true, ack: true, expire: 30});

    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });
    */
}
