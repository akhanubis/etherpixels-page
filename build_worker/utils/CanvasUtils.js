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
  /* so I cant do new ImageData... on CanvasUtils definition time because the script doesnt know about ImageData :/ */
  var cached_transparent_image_data = null;

  var transparent_image_data = function transparent_image_data(image_data_class) {
    cached_transparent_image_data = cached_transparent_image_data || new image_data_class(new Uint8ClampedArray([0, 0, 0, 0]), 1, 1);
    return cached_transparent_image_data;
  };

  var cached_semitrans_image_data = null;
  var semitrans_image_data = function semitrans_image_data(image_data_class) {
    cached_semitrans_image_data = cached_semitrans_image_data || new image_data_class(new Uint8ClampedArray([0, 0, 0, 127]), 1, 1);
    return cached_semitrans_image_data;
  };

  var getContext = function getContext(canvas, aliasing) {
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = aliasing;
    ctx.mozImageSmoothingEnabled = aliasing;
    ctx.webkitImageSmoothingEnabled = aliasing;
    ctx.msImageSmoothingEnabled = aliasing;
    return ctx;
  };

  var clear = function clear(ctx, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  var new_canvas = function new_canvas(dimension, must_clear) {
    var canvas = document.createElement('canvas');
    canvas.width = dimension;
    canvas.height = dimension;
    var ctx = getContext(canvas, false);
    if (must_clear) clear(ctx, 'rgba(0, 0, 0, 0)');
    return ctx;
  };

  var resize_secondary_canvas = function resize_secondary_canvas(old_ctx, dimension) {
    var new_ctx = new_canvas(dimension, true);
    var offset = 0.5 * (dimension - old_ctx.canvas.width);
    new_ctx.drawImage(old_ctx.canvas, offset, offset);
    return new_ctx;
  };

  var resize_canvas = function resize_canvas(old_ctx, new_canvas, new_size, old_max_index, new_max_index, i_data_for_new_pixel) {
    var offset_w, offset_h;
    var new_context = getContext(new_canvas, old_ctx ? old_ctx.imageSmoothingEnabled : false); /* preserve aliasing */
    new_canvas.width = new_size.width;
    new_canvas.height = new_size.height;
    clear(new_context, 'rgba(0,0,0,0)');
    if (old_ctx) {
      offset_w = 0.5 * (new_size.width - old_ctx.canvas.width);
      offset_h = 0.5 * (new_size.height - old_ctx.canvas.height);
      new_context.drawImage(old_ctx.canvas, offset_w, offset_h);
    }
    for (var i = old_max_index; i < new_max_index; i++) {
      var world_coords = _ContractToWorld2.default.index_to_coords(i + 1);
      var buffer_coords = _WorldToCanvas2.default.to_buffer(world_coords.x, world_coords.y, new_size);
      new_context.putImageData(i_data_for_new_pixel, buffer_coords.x, buffer_coords.y);
    }
    return {
      ctx: new_context,
      delta: {
        width: offset_w,
        height: offset_h
      }
    };
  };

  return {
    getContext: getContext,
    clear: clear,
    resize_canvas: resize_canvas,
    transparent_image_data: transparent_image_data,
    semitrans_image_data: semitrans_image_data,
    new_canvas: new_canvas,
    resize_secondary_canvas: resize_secondary_canvas
  };
}();

exports.default = CanvasUtils;
