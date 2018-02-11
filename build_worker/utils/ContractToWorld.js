"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ContractToWorld = function () {
  function ContractToWorld() {
    _classCallCheck(this, ContractToWorld);
  }

  _createClass(ContractToWorld, null, [{
    key: "init",
    value: function init(h_array) {
      this.genesis_block = h_array[0].toNumber();
      this.halving_array = h_array[1].map(function (n) {
        return n.toNumber();
      });
    }
  }, {
    key: "index_to_coords",
    value: function index_to_coords(i) {
      if (i === 0) return { x: 0, y: 0 };

      var _find_ring_and_first_ = this.find_ring_and_first_index(i),
          first_index = _find_ring_and_first_.first_index,
          ring = _find_ring_and_first_.ring;

      var result = void 0;
      if (i < first_index + 2 * ring) result = this.f_x_max(i, first_index, ring);else if (i < first_index + 4 * ring) result = this.f_y_min(i, first_index, ring);else if (i < first_index + 6 * ring) result = this.f_x_min(i, first_index, ring);else result = this.f_y_max(i, first_index, ring);
      return result;
    }

    /* return (block.number - g_block) + (block.number <= halving_1 ? block.number - g_block : halving_1 - g_block) + (block.number <= halving_2 ? block.number - g_block : halving_2 - g_block) + (block.number <= halving_3 ? block.number - g_block : halving_3 - g_block); */

  }, {
    key: "max_index",
    value: function max_index(current_block) {
      var _this = this;

      return this.halving_array.reduce(function (total, threshold) {
        return total += current_block <= threshold ? current_block - _this.genesis_block : threshold - _this.genesis_block;
      }, current_block - this.genesis_block);
    }
  }, {
    key: "canvas_dimension",
    value: function canvas_dimension(max_index) {
      return this.find_ring_and_first_index(max_index).ring * 2 + 1;
    }
  }, {
    key: "find_ring_and_first_index",
    value: function find_ring_and_first_index(i) {
      var ring = Math.floor(0.5 * Math.ceil(Math.sqrt(i + 1)));
      return {
        ring: ring,
        first_index: Math.pow(ring * 2 - 1, 2)
      };
    }
  }, {
    key: "f_x_max",
    value: function f_x_max(i, fi, r) {
      return { x: r, y: fi + r - i - 1 };
    }
  }, {
    key: "f_x_min",
    value: function f_x_min(i, fi, r) {
      return { x: -r, y: i + 1 - (fi + 5 * r) };
    }
  }, {
    key: "f_y_max",
    value: function f_y_max(i, fi, r) {
      return { x: i + 1 - (fi + 7 * r), y: r };
    }
  }, {
    key: "f_y_min",
    value: function f_y_min(i, fi, r) {
      return { x: fi + 3 * r - i - 1, y: -r };
    }
  }]);

  return ContractToWorld;
}();

exports.default = ContractToWorld;
