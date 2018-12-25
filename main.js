"use strict";

// you have to require the utils module and call adapter function
var utils = require(__dirname + '/lib/utils'); // Get common adapter utils
var hilink = require('hilinkhuawei');
var adapter = utils.Adapter('hilink');

var existingStates = {};


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
 adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});


// is called if a subscribed state changes
function last_sms(res) {
 var data_res = {};
 delete res.Priority;
 delete res.SaveType;
 delete res.Sca;
 delete res.SmsType;
 delete res.Smstat;
 data_res.response = res;
 data_res.response.json = JSON.stringify(res);
 adapter.getState('last_sms.Date', function (err, state) {
  if (state == null || state.val != res.Date) {
   setHilink("last_sms", data_res);
   adapter.log.info('last_sms ' + JSON.stringify(res));
   hilink.setRead(res.Index, function (response) {});
  }
 });
}

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
 if (id == adapter.namespace + '.smscount.LocalUnread') {
  if (state.val != 0 && state.val != '0') {
   hilink.listNew(function (response) {
    if (response.response != "no_new_sms") {
     adapter.log.info('length ' + response.response.length);
     for (var i = 0; i < response.response.length; i++) {
      last_sms(response.response[i])
     }
    } else {
     adapter.log.info(response.response);
    }
   });
  }
 }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
 adapter.log.info('send obg ' + JSON.stringify(obj));
 if (typeof obj == 'object' && obj.message) {
  if (obj.command == 'control') {
   //adapter.log.info(JSON.stringify(obj.message));
   if (obj.message == 'connect' || obj.message == 'disconnect' || obj.message == 'reboot') {
    //adapter.log.info(JSON.stringify(obj.message));
    hilink.control(obj.message, function (response) {
     if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
    });
   }
  } else if (obj.command == 'send') {
   if (obj.message.phone && obj.message.message) {
    hilink.send(obj.message.phone, obj.message.message, function (response) {
     if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
    });
   }
  } else if (obj.command == 'read') {
   if (obj.message == 'outbox' || obj.message == 'inbox' || obj.message == 'new') {
    if (obj.message == 'inbox') {
     hilink.listInbox(function (response) {
      if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
     });
    } else if (obj.message == 'outbox') {
     hilink.listOutbox(function (response) {
      if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
     });
    } else if (obj.message == 'new') {
     hilink.listNew(function (response) {
      if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
     });
    }
   }
  } else if (obj.command == 'ussd') {
   if (obj.message) {
    hilink.ussd(obj.message, function (response) {
     if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
    });
   }
  } else if (obj.command == 'delete') {
   if (obj.message) {
    hilink.delete(obj.message, function (response) {
     if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
    });
   }
  } else if (obj.command == 'clear') {
   if (obj.message == 'inbox' || obj.message == 'outbox') {
    if (obj.message == 'inbox') hilink.clearInbox();
    if (obj.message == 'outbox') hilink.clearOutbox();
   }
  } else if (obj.command == 'setRead') {
   if (obj.message == 'all') {
    hilink.readAll(function (response) {
     if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
    });
   } else {
    hilink.setRead(obj.message, function (response) {
     if (obj.callback) adapter.sendTo(obj.from, obj.command, response, obj.callback);
    });
   }
  }
 }
});
adapter.on('ready', function () {
 main();
});

function setValue(id, val) {
 if (existingStates[id]) {
  adapter.setState(id, {
   val: val,
   ack: true
  });
 } else {
  adapter.getState(id, function (err, obj) {
   //      adapter.log.info(id +  + ' obj: ' + obj);
   if (obj === null) {
    adapter.setObjectNotExists(id, {
     type: 'state',
     common: {
      name: id.split('.')[id.split('.').length - 1],
      type: 'mixed',
      role: 'indicator',
      read: 'true',
      write: 'true'
     },
     native: {}
    });
    existingStates[id] = true;
    setValue(id, val);
   } else {
    existingStates[id] = true;
    setValue(id, val);
   }
  });
 }
}

function setHilink(setid, response) {
 if (response && typeof(response.response) === "object") {
  var val;
  for (var key in response.response) {
   val = response.response[key];
   if (key && val) setValue(setid + '.' + key, val);
  }
 }

}

function timeStatus() {
 hilink.smsCount(function (response) {
  setHilink("smscount", response);
 });
 hilink.statusNet(function (response) {
  setHilink("info.net", response);
 });
 hilink.status(function (response) {
  setHilink("info.status", response);
 });
 hilink.signal(function (response) {
  setHilink("info.signal", response);
 });
 hilink.traffic(function (response) {
  setHilink("traffic.total", response);
 });
 hilink.trafficMonth(function (response) {
  setHilink("traffic.month", response);
 });
}

function main() {
 adapter.log.info('config getip: ' + adapter.config.getip);
 adapter.log.info('config trafficInfo: ' + adapter.config.trafficInfo);
 adapter.log.info('config settime: ' + adapter.config.settime);
 adapter.log.info('config setTest: ' + adapter.config.setTest);
 adapter.log.info('config model: ' + adapter.config.model);
 hilink.setIp(adapter.config.getip);
 hilink.setTrafficInfo(adapter.config.trafficInfo);
 hilink.setModel(adapter.config.model);
 setInterval(timeStatus, Number(adapter.config.settime * 1000));
 adapter.subscribeStates('smscount.LocalUnread');
}
