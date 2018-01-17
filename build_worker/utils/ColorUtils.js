'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var ColorUtils = function () {
  var emptyColor = '#000000';

  var _intToPaddedHex = function _intToPaddedHex(int) {
    return ('00' + int.toString(16)).slice(-2);
  };

  var rgbToHex = function rgbToHex(rgb) {
    return '#' + _intToPaddedHex(rgb.r) + _intToPaddedHex(rgb.g) + _intToPaddedHex(rgb.b);
  };

  var hexToIntArray = function hexToIntArray(hex) {
    return [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16), 255];
  };

  var hexToRgb = function hexToRgb(hex) {
    var int_array = hexToIntArray(hex);
    return {
      r: int_array[0],
      g: int_array[1],
      b: int_array[2],
      a: int_array[3]
    };
  };

  var hexToBytes3 = function hexToBytes3(hex) {
    return '0x' + hex.substr(1, 6);
  };

  var _randomChannel = function _randomChannel() {
    return Math.floor(Math.random() * 256);
  };

  var bytes3ToHex = function bytes3ToHex(bytes3) {
    return '#' + bytes3.substr(2, 6);
  };

  var rgbToBytes3 = function rgbToBytes3(rgb) {
    return hexToBytes3(rgbToHex(rgb));
  };

  var bytes3ToIntArray = function bytes3ToIntArray(bytes3) {
    return hexToIntArray(bytes3ToHex(bytes3));
  };

  var randomColor = function randomColor() {
    return {
      r: _randomChannel(),
      g: _randomChannel(),
      b: _randomChannel(),
      a: 255
    };
  };

  return {
    rgbToBytes3: rgbToBytes3,
    rgbToHex: rgbToHex,
    bytes3ToHex: bytes3ToHex,
    bytes3ToIntArray: bytes3ToIntArray,
    hexToRgb: hexToRgb,
    hexToIntArray: hexToIntArray,
    hexToBytes3: hexToBytes3,
    emptyColor: emptyColor,
    randomColor: randomColor
  };
}();

exports.default = ColorUtils;
