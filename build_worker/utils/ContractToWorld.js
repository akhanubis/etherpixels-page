"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ContractToWorld = function () {
  function ContractToWorld(index) {
    _classCallCheck(this, ContractToWorld);

    this.i = index;
    this.find_ring_and_first_index();
  }

  _createClass(ContractToWorld, [{
    key: "find_ring_and_first_index",
    value: function find_ring_and_first_index() {
      this.ring = Math.floor(0.5 * Math.ceil(Math.sqrt(this.i + 1)));
      this.first_index = Math.pow(this.ring * 2 - 1, 2);
    }
  }, {
    key: "get_coords",
    value: function get_coords() {
      if (this.i === 0) return { x: 0, y: 0 };
      var result = void 0;
      if (this.i < this.first_index + 2 * this.ring) result = this.f_x_max();else if (this.i < this.first_index + 4 * this.ring) result = this.f_y_min();else if (this.i < this.first_index + 6 * this.ring) result = this.f_x_min();else result = this.f_y_max();
      return result;
    }
  }, {
    key: "f_x_max",
    value: function f_x_max() {
      return { x: this.ring, y: this.first_index + this.ring - this.i - 1 };
    }
  }, {
    key: "f_x_min",
    value: function f_x_min() {
      return { x: -this.ring, y: this.i + 1 - (this.first_index + 5 * this.ring) };
    }
  }, {
    key: "f_y_max",
    value: function f_y_max() {
      return { x: this.i + 1 - (this.first_index + 7 * this.ring), y: this.ring };
    }
  }, {
    key: "f_y_min",
    value: function f_y_min() {
      return { x: this.first_index + 3 * this.ring - this.i - 1, y: -this.ring };
    }
  }], [{
    key: "max_index",
    value: function max_index(genesis_block, current_block) {
      return current_block + 1 - genesis_block;
    }
  }, {
    key: "canvas_dimension",
    value: function canvas_dimension(max_i) {
      return new this(max_i).ring * 2 + 1;
    }
  }]);

  return ContractToWorld;
}();

exports.default = ContractToWorld;
