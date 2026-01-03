"use strict";

var utils = require('../utils');
var log = require('npmlog');

const ACCESS_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

module.exports = function (defaultFuncs, api, ctx) {
  
  function handleAvatar(userIDs, height, width) {
    var cb;
    var uploads = [];
    
    var rtPromise = new Promise(function (resolve, reject) {
      cb = (error, data) => data ? resolve(data) : reject(error);
    });

    userIDs.map(function (v) {
      var url = `https://graph.facebook.com/${v}/picture?height=${height}&width=${width}&redirect=false&access_token=${ACCESS_TOKEN}`;
      
      var mainPromise = defaultFuncs
        .get(url, ctx.jar)
        .then(function (res) {
          try {
            var data = JSON.parse(res.body);
            return {
              userID: v,
              url: data.data.url
            };
          } catch (e) {
            return {
              userID: v,
              url: `https://graph.facebook.com/${v}/picture?height=${height}&width=${width}&access_token=${ACCESS_TOKEN}`
            };
          }
        })
        .catch(function (err) {
          return cb(err);
        });
        
      uploads.push(mainPromise);
    });

    Promise
      .all(uploads)
      .then(function (res) {
        var resultObject = res.reduce(function (Obj, item) {
          if (item && item.userID) {
            Obj[item.userID] = item.url;
          }
          return Obj;
        }, {});
        return cb(null, resultObject);
      })
      .catch(function (err) {
        return cb(err);
      });

    return rtPromise;
  }

  return function getAvatarUser(userIDs, size = [1500, 1500], callback) {
    var cb;
    var rtPromise = new Promise(function (resolve, reject) {
      cb = (err, res) => res ? resolve(res) : reject(err);
    });

    (typeof size == 'string' || typeof size == 'number') ? size = [size, size] : Array.isArray(size) && size.length == 1 ? size = [size[0], size[0]] : null;

    if (typeof size == 'function') {
      callback = size;
      size = [1500, 1500];
    }
    
    if (typeof callback == 'function') cb = callback;
    if (!Array.isArray(userIDs)) userIDs = [userIDs];
    
    var [height, width] = size;

    handleAvatar(userIDs, height, width)
      .then(function (res) {
        return cb(null, res);
      })
      .catch(function (err) {
        log.error('getAvatarUser', err);
        return cb(err);
      });

    return rtPromise;
  }
};