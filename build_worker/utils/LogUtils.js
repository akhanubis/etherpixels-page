'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var LogUtils = function () {
  var to_sorted_event = function to_sorted_event(sorted, log) {
    sorted[log.transactionHash] = sorted[log.transactionHash] || {
      hash: log.transactionHash,
      owner: log.args.new_owner,
      pixels: []
    };
    sorted[log.transactionHash].pixels.push({
      i: log.args.i.toNumber(),
      color: log.args.new_color,
      price: log.args.price.toNumber(),
      painted: log.event === 'PixelPainted',
      old_owner: log.args.old_owner || 0
    });
  };

  return {
    to_sorted_event: to_sorted_event
  };
}();

exports.default = LogUtils;
