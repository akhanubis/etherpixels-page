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

  var remaining_txs = function remaining_txs(pending_txs, pusher_events) {
    var events_per_tx = pusher_events.reduce(function (grouped, e) {
      grouped[e.tx] = grouped[e.tx] || {};
      grouped[e.tx].indexes = grouped[e.tx].indexes || [];
      grouped[e.tx].indexes.push(e.i);
      grouped[e.tx].caller = e.owner;
      return grouped;
    }, {});
    events_per_tx = Object.keys(events_per_tx).map(function (key) {
      return events_per_tx[key];
    });
    return pending_txs.filter(function (pending_tx) {
      /* take out the txs that were sent by the same account and referencing the same pixels than one of the pusher txs */
      return !events_per_tx.some(function (event_tx) {
        return event_tx.caller === pending_tx.caller && event_tx.indexes.length === pending_tx.pixels.length && event_tx.indexes.every(function (i) {
          return pending_tx.pixels.find(function (p) {
            return p.index === i;
          });
        });
      });
    });
  };

  return {
    to_events: to_events,
    to_event: to_event,
    remaining_txs: remaining_txs
  };
}();

exports.default = LogUtils;
