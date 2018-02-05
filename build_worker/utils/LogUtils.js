"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var LogUtils = function () {
  var to_sorted_event = function to_sorted_event(sorted, log) {
    sorted[log.transactionHash] = sorted[log.transactionHash] || [];
    sorted[log.transactionHash].push({
      i: log.args.i.toNumber(),
      owner: log.args.new_owner,
      color: log.args.new_color,
      locked_until: log.args.locked_until.toNumber(),
      tx: log.transactionHash
    });
  };

  var remaining_txs = function remaining_txs(pending_txs, pusher_events) {
    var indexes = pusher_events.map(function (e) {
      return e.i;
    });
    return pending_txs.filter(function (pending_tx) {
      /* take out the tx that was sent by the same account and referencing the same pixels than the one given */
      return !(pusher_events[0].owner === pending_tx.caller && indexes.length === pending_tx.pixels.length && indexes.every(function (i) {
        return pending_tx.pixels.find(function (p) {
          return p.index === i;
        });
      }));
    });
  };

  return {
    to_sorted_event: to_sorted_event,
    remaining_txs: remaining_txs
  };
}();

exports.default = LogUtils;
