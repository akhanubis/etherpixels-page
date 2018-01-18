'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ContractToWorld = require('./ContractToWorld.js');

var _ContractToWorld2 = _interopRequireDefault(_ContractToWorld);

var _WorldToCanvas = require('./WorldToCanvas.js');

var _WorldToCanvas2 = _interopRequireDefault(_WorldToCanvas);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var CanvasUtils = function () {
  var getContext = function getContext(canvas, aliasing) {
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = aliasing;
    ctx.mozImageSmoothingEnabled = aliasing;
    ctx.webkitImageSmoothingEnabled = aliasing;
    ctx.msImageSmoothingEnabled = aliasing;
    return ctx;
  };

  var clear = function clear(ctx, color, canvas_size) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas_size.width, canvas_size.height);
  };

  var resize_canvas = function resize_canvas(old_ctx, new_canvas, new_size, old_max_index, new_max_index, image_data_class, callback) {
    var offset_w, offset_h;
    var new_context = new_canvas.getContext('2d');
    new_canvas.width = new_size.width;
    new_canvas.height = new_size.height;
    clear(new_context, 'rgba(0,0,0,0)', new_size);
    if (old_ctx) {
      offset_w = 0.5 * (new_size.width - old_ctx.canvas.width);
      offset_h = 0.5 * (new_size.height - old_ctx.canvas.height);
      new_context.drawImage(old_ctx.canvas, offset_w, offset_h);
    }
    var i_data = new image_data_class(new Uint8ClampedArray([0, 0, 0, 127]), 1, 1);
    var new_pixels_world_coords = [];
    for (var i = old_max_index; i < new_max_index; i++) {
      var world_coords = new _ContractToWorld2.default(i + 1).get_coords();
      var buffer_coords = _WorldToCanvas2.default.to_buffer(world_coords.x, world_coords.y, new_size);
      new_context.putImageData(i_data, buffer_coords.x, buffer_coords.y);
      new_pixels_world_coords.push(world_coords);
    }
    callback(new_context, new_pixels_world_coords, offset_w, offset_h);
  };

  return {
    getContext: getContext,
    clear: clear,
    resize_canvas: resize_canvas
  };
}();

exports.default = CanvasUtils;
