"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var LogUtils = function () {
  var to_sorted_event = function to_sorted_event(sorted, log) {
    sorted[log.transactionHash] = sorted[log.transactionHash] || {
      tx: log.transactionHash,
      owner: log.args.new_owner,
      locked_until: log.args.locked_until.toNumber(),
      pixels: []
    };
    sorted[log.transactionHash].pixels.push({
      i: log.args.i.toNumber(),
      color: log.args.new_color
    });
  };

  var mined_tx_index = function mined_tx_index(pending_txs, tx_info) {
    var indexes = tx_info.pixels.map(function (p) {
      return p.i;
    });
    return pending_txs.findIndex(function (pending_tx) {
      /* find the tx that was sent by the same account and referencing the same pixels than the one given */
      return tx_info.owner === pending_tx.caller && indexes.length === pending_tx.pixels.length && indexes.every(function (i) {
        return pending_tx.pixels.find(function (p) {
          return p.index === i;
        });
      });
    });
  };

  return {
    to_sorted_event: to_sorted_event,
    mined_tx_index: mined_tx_index
  };
}();

exports.default = LogUtils;
