'use strict';

/*
 * Created with @iobroker/create-adapter v2.3.0
 */

const utils = require('@iobroker/adapter-core');
const hilink = require('hilinkhuawei');

class Hilink extends utils.Adapter {
    constructor(options) {
        super({
            ...options,
            name: 'hilink',
        });
        this.existingStates = {}
        this.hilink = hilink
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    async onReady() {
        this.setState('info.connection', true, true);

        this.log.info('config model: ' + this.config.model);
        this.log.info('config time: ' + this.config.time);
        this.log.info('config ip: ' + this.config.ip);
        this.log.info('config trafficInfo: ' + this.config.trafficInfo);

        await this.setObjectNotExistsAsync('smscount.LocalUnread', {
            type: 'state', common: { name: 'smscount.LocalUnread', type: 'boolean', role: 'indicator', read: true, write: true, }, native: {},
        });

        this.hilink.setIp(this.config.ip);
        this.hilink.setTrafficInfo(this.config.trafficInfo);
        this.hilink.setModel(this.config.model);

        setInterval(this.timeStatus.bind(this), this.config.time * 1000);
        this.timeStatus()
        this.subscribeStates('smscount.LocalUnread');

    }

    onUnload(callback) {
        try {
            clearTimeout(this.timeStatus);

            callback();
        } catch (e) {
            callback();
        }
    }

    last_sms(res) {
        var data_res = {};
        delete res.Priority;
        delete res.SaveType;
        delete res.Sca;
        delete res.SmsType;
        delete res.Smstat;
        data_res.response = res;
        data_res.response.json = JSON.stringify(res);
        this.getState('last_sms.Date', (err, state) => {
            if (state == null || state.val != res.Date) {
                this.setHilink("last_sms", data_res);
                this.log.info('last_sms ' + JSON.stringify(res));
                this.hilink.setRead(res.Index, (response) => { });
            }
        });
    }

    timeStatus() {
        this.hilink.smsCount((response) => {
            this.setHilink("smscount", response);
        });
        this.hilink.statusNet((response) => {
            this.setHilink("info.net", response);
        });
        this.hilink.status((response) => {
            this.setHilink("info.status", response);
        });
        this.hilink.signal((response) => {
            this.setHilink("info.signal", response);
        });
        this.hilink.traffic((response) => {
            this.setHilink("traffic.total", response);
        });
        this.hilink.trafficMonth((response) => {
            this.setHilink("traffic.month", response);
        });
    }


    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);


            if (state.val != 0 && state.val != '0') {
                this.hilink.listNew((response) => {
                    if (response.response != "no_new_sms") {
                        this.log.info('length ' + response.response.length);
                        for (var i = 0; i < response.response.length; i++) {
                            this.last_sms(response.response[i])
                        }
                    } else {
                        this.log.info(response.response);
                    }
                });
            }


        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    async setValue(id, val) {

        await this.setObjectNotExistsAsync(id, {
            type: 'state', common: { id, type: 'mixed', role: 'indicator', read: true, write: true }, native: {}
        });

        await this.setStateAsync(id, val, true);
    }

    setHilink(setid, response) {
        if (response && typeof (response.response) === "object") {
            for (var key in response.response) {
                const val = response.response[key];
                if (key && val) this.setValue(setid + '.' + key, val);
            }
        }

    }

    onMessage(obj) {
        this.log.info('send obg ' + JSON.stringify(obj));
        if (typeof obj == 'object' && obj.message) {
            if (obj.command == 'control') {
                //this.log.info(JSON.stringify(obj.message));
                if (obj.message == 'connect' || obj.message == 'disconnect' || obj.message == 'reboot') {
                    //this.log.info(JSON.stringify(obj.message));
                    this.hilink.control(obj.message, (response) => {
                        if (obj.callback) this.sendTo(obj.from, obj.command, response, obj.callback);
                    });
                }
            } else if (obj.command == 'send') {
                if (obj.message.phone && obj.message.message) {
                    this.hilink.send(obj.message.phone, obj.message.message, (response) => {
                        if (obj.callback) this.sendTo(obj.from, obj.command, response, obj.callback);
                    });
                }
            } else if (obj.command == 'read') {
                if (obj.message == 'outbox' || obj.message == 'inbox' || obj.message == 'new') {
                    if (obj.message == 'inbox') {
                        this.hilink.listInbox((response) => {
                            if (obj.callback) this.sendTo(obj.from, obj.command, response, obj.callback);
                        });
                    } else if (obj.message == 'outbox') {
                        this.hilink.listOutbox((response) => {
                            if (obj.callback) this.sendTo(obj.from, obj.command, response, obj.callback);
                        });
                    } else if (obj.message == 'new') {
                        this.hilink.listNew((response) => {
                            if (obj.callback) this.sendTo(obj.from, obj.command, response, obj.callback);
                        });
                    }
                }
            } else if (obj.command == 'ussd') {
                if (obj.message) {
                    this.hilink.ussd(obj.message, (response) => {
                        if (obj.callback) this.sendTo(obj.from, obj.command, response, obj.callback);
                    });
                }
            } else if (obj.command == 'delete') {
                if (obj.message) {
                    this.hilink.delete(obj.message, (response) => {
                        if (obj.callback) this.sendTo(obj.from, obj.command, response, obj.callback);
                    });
                }
            } else if (obj.command == 'clear') {
                if (obj.message == 'inbox' || obj.message == 'outbox') {
                    if (obj.message == 'inbox') this.hilink.clearInbox();
                    if (obj.message == 'outbox') this.hilink.clearOutbox();
                }
            } else if (obj.command == 'setRead') {
                if (obj.message == 'all') {
                    this.hilink.readAll((response) => {
                        if (obj.callback) this.sendTo(obj.from, obj.command, response, obj.callback);
                    });
                } else {
                    this.hilink.setRead(obj.message, (response) => {
                        if (obj.callback) this.sendTo(obj.from, obj.command, response, obj.callback);
                    });
                }
            }
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Hilink(options);
} else {
    // otherwise start the instance directly
    new Hilink();
}
