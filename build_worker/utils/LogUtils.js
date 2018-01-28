"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var LogUtils = function () {
  var to_event = function to_event(log) {
    return {
      i: log.args.i.toNumber(),
      owner: log.args.new_owner,
      color: log.args.new_color,
      locked_until: log.args.locked_until.toNumber(),
      tx: log.transactionHash,
      log_index: log.logIndex
    };
  };

  var to_events = function to_events(logs) {
    return logs.map(function (l) {
      return to_event(l);
    });
  };

  return {
    to_events: to_events,
    to_event: to_event
  };
}();

exports.default = LogUtils;
