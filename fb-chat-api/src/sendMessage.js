"use strict";

var utils = require("../utils");
var log = require("../../logger/logger.js").log;

module.exports = function (defaultFuncs, api, ctx) {
    return function sendMessage(msg, threadID, callback) {
        if (!callback) {
            callback = function () { };
        }
        if (msg == null || msg == undefined) {
            return callback({ error: "Message cannot be null or undefined" });
        }
        if (threadID == null || threadID == undefined) {
            return callback({ error: "ThreadID cannot be null or undefined" });
        }
        if (typeof msg === "string") {
            msg = { body: msg };
        }
        
        var messageAndOTID = utils.generateOfflineThreadingID();
        var form = {
            'client': 'mercury',
            'action_type': 'ma-type:user-generated-message',
            'author': 'fbid:' + ctx.i_userID || ctx.userID,
            'timestamp': Date.now(),
            'source': 'source:chat:web',
            'source_tags[0]': 'source:chat',
            'body': msg.body ? msg.body.toString() : "",
            'html_body': false,
            'ui_push_phase': 'C3',
            'status': '0',
            'offline_threading_id': messageAndOTID,
            'message_id': messageAndOTID,
            'threading_id': utils.generateThreadingID(ctx.clientID),
            'ephemeral_ttl_mode:': '0',
            'manual_retry_cnt': '0',
            'has_attachment': !!(msg.attachment || msg.url),
            'signatureID': utils.getSignatureID(),
            'replied_to_message_id': msg.replied_to_message_id || ''
        };

        if (msg.attachment) {
            form['image_url'] = msg.attachment;
        }

        if (msg.url) {
            form['url'] = msg.url;
        }

        if (msg.mentions) {
            for (let i = 0; i < msg.mentions.length; i++) {
                form['profile_xmd[' + i + '][id]'] = msg.mentions[i].id;
                form['profile_xmd[' + i + '][offset]'] = msg.mentions[i].offset;
                form['profile_xmd[' + i + '][length]'] = msg.mentions[i].length;
                form['profile_xmd[' + i + '][type]'] = 'p';
            }
        }

        form = defaultFuncs.formatForm(form);

        defaultFuncs
            .post("https://www.facebook.com/messaging/send/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
            .then(function (resData) {
                if (resData.error) {
                    return callback(resData);
                }
                return callback(null, resData);
            })
            .catch(function (err) {
                log.error("sendMessage", err);
                return callback(err);
            });
    };

    function sendPrivateMessage(userID, msg, callback) {
        if (!callback) {
            callback = function () { };
        }
        if (msg == null || msg == undefined) {
            return callback({ error: "Message cannot be null or undefined" });
        }
        if (userID == null || userID == undefined) {
            return callback({ error: "UserID cannot be null or undefined" });
        }
        if (typeof msg === "string") {
            msg = { body: msg };
        }

        var messageAndOTID = utils.generateOfflineThreadingID();
        var form = {
            'client': 'mercury',
            'action_type': 'ma-type:user-generated-message',
            'author': 'fbid:' + ctx.i_userID || ctx.userID,
            'timestamp': Date.now(),
            'source': 'source:chat:web',
            'source_tags[0]': 'source:chat',
            'body': msg.body ? msg.body.toString() : "",
            'html_body': false,
            'ui_push_phase': 'C3',
            'status': '0',
            'offline_threading_id': messageAndOTID,
            'message_id': messageAndOTID,
            'threading_id': utils.generateThreadingID(ctx.clientID),
            'ephemeral_ttl_mode:': '0',
            'manual_retry_cnt': '0',
            'has_attachment': !!(msg.attachment || msg.url),
            'signatureID': utils.getSignatureID(),
            'replied_to_message_id': msg.replied_to_message_id || '',
            'specific_to_list[0]': 'fbid:' + userID,
            'specific_to_list[1]': 'fbid:' + ctx.i_userID || ctx.userID
        };

        if (msg.attachment) {
            form['image_url'] = msg.attachment;
        }

        if (msg.url) {
            form['url'] = msg.url;
        }

        form = defaultFuncs.formatForm(form);

        defaultFuncs
            .post("https://www.facebook.com/messaging/send/", ctx.jar, form)
            .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
            .then(function (resData) {
                if (resData.error) {
                    return callback(resData);
                }
                return callback(null, resData);
            })
            .catch(function (err) {
                log.error("sendPrivateMessage", err);
                return callback(err);
            });
    }

    return {
        sendMessage: sendMessage,
        sendPrivateMessage: sendPrivateMessage
    };
};