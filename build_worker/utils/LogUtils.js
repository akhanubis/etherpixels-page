'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var LogUtils = function () {
  var to_sorted_event = function to_sorted_event(sorted, log) {
    sorted[log.transactionHash] = sorted[log.transactionHash] || {
      tx: log.transactionHash,
      owner: log.args.new_owner,
      pixels: []
    };
    sorted[log.transactionHash].pixels.push({
      i: log.args.i.toNumber(),
      color: log.args.new_color,
      locked_until: log.args.locked_until.toNumber(),
      painted: log.event === 'PixelPainted'
    });
  };

  var mined_tx = function mined_tx(pending_txs, tx_info) {
    var indexes = tx_info.pixels.map(function (p) {
      return p.i;
    });
    /* find the tx that was sent referencing the same pixels than the one given */
    return pending_txs.find(function (pending_tx) {
      return pending_tx.owner === tx_info.owner && indexes.length === pending_tx.pixels.length && indexes.every(function (i) {
        return pending_tx.pixels.find(function (p) {
          return p.index === i;
        });
      });
    });
  };

  var matching_tx_with_gas = function matching_tx_with_gas(pending_txs, tx_info) {
    return pending_txs.find(function (pending_tx) {
      return pending_tx.owner === tx_info.owner && pending_tx.gas === tx_info.gas;
    });
  };

  return {
    to_sorted_event: to_sorted_event,
    mined_tx: mined_tx,
    matching_tx_with_gas: matching_tx_with_gas
  };
}();

exports.default = LogUtils;
