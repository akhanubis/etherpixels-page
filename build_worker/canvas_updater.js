"use strict";

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _Etherpixels = require("../build/contracts/Etherpixels.json");

var _Etherpixels2 = _interopRequireDefault(_Etherpixels);

var _ColorUtils = require("./utils/ColorUtils.js");

var _ColorUtils2 = _interopRequireDefault(_ColorUtils);

var _ContractToWorld = require("./utils/ContractToWorld.js");

var _ContractToWorld2 = _interopRequireDefault(_ContractToWorld);

var _WorldToCanvas = require("./utils/WorldToCanvas.js");

var _WorldToCanvas2 = _interopRequireDefault(_WorldToCanvas);

var _CanvasUtils = require("./utils/CanvasUtils.js");

var _CanvasUtils2 = _interopRequireDefault(_CanvasUtils);

var _LogUtils = require("./utils/LogUtils.js");

var _LogUtils2 = _interopRequireDefault(_LogUtils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('http').globalAgent.maxSockets = require('https').globalAgent.maxSockets = 20;
require('dotenv').config({ silent: true, path: process.env.ENV_PATH });

process.on('warning', function (e) {
  return console.warn(e.stack);
});

var zlib = require('zlib');
var Canvas = require('canvas');
var left_pad = require('left-pad');

var ProviderEngine = require('web3-provider-engine');
var FilterSubprovider = require('web3-provider-engine/subproviders/filters.js');
var RpcSubprovider = require('web3-provider-engine/subproviders/rpc.js');

var canvasContract = require('truffle-contract')(_Etherpixels2.default);

var buffer_entry_size = 32; /* 20 bytes for address, 12 bytes for locked_until */
var free_pixel_buffer_entry = '0000000000000000000000000000000000000000000000000000048c27395000'; /* empty address and 5000000000000 starting price */
var new_pixel_image_data = _CanvasUtils2.default.semitrans_image_data(Canvas.ImageData);
var new_pixel_price_data = _CanvasUtils2.default.new_price_data(Canvas.ImageData);

var admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_APP_NAME,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: "-----BEGIN PRIVATE KEY-----\n" + process.env.FIREBASE_PRIVATE_KEY + "\n-----END PRIVATE KEY-----\n"
  }),
  databaseURL: "https://" + process.env.FIREBASE_APP_NAME + ".firebaseio.com",
  storageBucket: process.env.FIREBASE_APP_NAME + ".appspot.com"
});
var bucket_ref = admin.storage().bucket();
var pixels_file_name = 'pixels.png';
var prices_file_name = 'prices.png';
var buffer_file_name = 'addresses.buf';
var init_file_name = 'init.json';

var canvas_dimension = void 0,
    pixel_buffer_ctx = void 0,
    prices_ctx = void 0,
    last_cache_block = void 0,
    current_block = void 0,
    max_index = void 0,
    instance = void 0,
    provider = void 0,
    logs_formatter = void 0;
var address_buffer = Buffer.alloc(0);

var init_provider = function init_provider() {
  if (process.env.NODE_ENV === 'development') {
    console.log('Using development web3');
    var w = require('web3');
    provider = new w.providers.HttpProvider('http://127.0.0.1:9545');
  } else {
    console.log('Using Infura');
    provider = new ProviderEngine();
    provider.addProvider(new FilterSubprovider());
    provider.addProvider(new RpcSubprovider({
      rpcUrl: "https://" + process.env.INFURA_NETWORK + ".infura.io/" + process.env.INFURA_API_KEY
    }));
    provider.on('error', function (err) {
      return console.error(err.stack);
    });
    provider.start();
  }
};

var wrap_upload = function wrap_upload(filename, content) {
  bucket_ref.file(filename).save(content).then(function () {
    console.log(filename + " uploaded");
  }).catch(function () {
    console.log(filename + " upload failed");
  });
};

var update_cache = function update_cache() {
  console.log("Updating cache...");
  wrap_upload(pixels_file_name, pixel_buffer_ctx.canvas.toBuffer());
  wrap_upload(prices_file_name, prices_ctx.canvas.toBuffer());
  wrap_upload(init_file_name, JSON.stringify({ contract_address: instance.address, last_cache_block: current_block }));
  wrap_upload(buffer_file_name, zlib.deflateRawSync(address_buffer));
};

var process_new_block = function process_new_block(b_number) {
  console.log('================================');
  console.log("New block: " + b_number);
  var old_dimension = canvas_dimension;
  var old_index = store_new_index(b_number);
  resize_assets(old_index);
};

var update_pixel = function update_pixel(log) {
  var world_coords = _ContractToWorld2.default.index_to_coords(log.args.i.toNumber());
  var canvas_coords = _WorldToCanvas2.default.to_buffer(world_coords.x, world_coords.y, { width: canvas_dimension, height: canvas_dimension });
  var pixel_array = new Uint8ClampedArray(_ColorUtils2.default.bytes3ToIntArray(log.args.new_color));
  var pixel_image_data = new Canvas.ImageData(pixel_array, 1, 1);
  pixel_buffer_ctx.putImageData(pixel_image_data, canvas_coords.x, canvas_coords.y);
  var price_image_data = new Canvas.ImageData(_ColorUtils2.default.priceAsColor(log.args.price), 1, 1);
  prices_ctx.putImageData(price_image_data, canvas_coords.x, canvas_coords.y);
};

var update_buffer = function update_buffer(log) {
  var offset = buffer_entry_size * log.args.i.toNumber();
  var formatted_address = log.args.new_owner.substr(2, 40);
  var formatted_price = left_pad(log.args.price.toString(16), 24, 0);
  var entry = formatted_address + formatted_price;
  address_buffer.fill(entry, offset, offset + buffer_entry_size, 'hex');
};

var store_new_index = function store_new_index(b_number) {
  var old_index = max_index;
  current_block = b_number;
  max_index = _ContractToWorld2.default.max_index(current_block);
  canvas_dimension = _ContractToWorld2.default.canvas_dimension(max_index);
  return old_index;
};

var resize_canvas = function resize_canvas(ctx, new_image_data, old_i) {
  console.log("Resizing canvas to: " + canvas_dimension + "x" + canvas_dimension + "...");
  var new_canvas = new Canvas(canvas_dimension, canvas_dimension); /* ctx keeps a temp reference to old canvas */
  return _CanvasUtils2.default.resize_canvas(ctx, new_canvas, { width: canvas_dimension, height: canvas_dimension }, old_i, max_index, new_image_data).ctx;
};

var resize_buffer = function resize_buffer(old_i) {
  var new_length = buffer_entry_size * (max_index + 1);
  console.log("Resizing buffer to: " + new_length + "...");
  address_buffer = Buffer.concat([address_buffer, Buffer.allocUnsafeSlow(buffer_entry_size * (max_index - old_i)).fill(free_pixel_buffer_entry, 'hex')], new_length);
};

var resize_assets = function resize_assets(old_i) {
  console.log("Resizing assets: " + old_i + " => " + max_index + "...");
  pixel_buffer_ctx = resize_canvas(pixel_buffer_ctx, new_pixel_image_data, old_i);
  prices_ctx = resize_canvas(prices_ctx, new_pixel_price_data, old_i);
  resize_buffer(old_i);
};

var start_watching = function start_watching() {
  var events_filter = instance.allEvents();
  events_filter.stopWatching();
  logs_formatter = events_filter.formatter;

  process_past_logs(last_cache_block, current_block);

  setInterval(function () {
    fetch_current_block().then(function (new_block) {
      if (new_block > current_block) {
        var last_processed_block = current_block;
        try {
          process_new_block(new_block);
          process_past_logs(last_processed_block + 1, new_block);
          prune_database(last_processed_block);
        } catch (e) {
          console.log('Error while processing new block:');
          console.log(e);
          current_block = last_processed_block;
        }
      }
    });
  }, 10000);
};

var prune_database = function prune_database(until_b_number) {
  console.log("Pruning database until " + until_b_number);
  var blocks_ref = admin.database().ref('blocks');
  blocks_ref.orderByKey().endAt(until_b_number.toString()).once('value').then(function (snapshot) {
    var updates = {};
    snapshot.forEach(function (child) {
      updates[child.key] = null;
    });
    blocks_ref.update(updates);
  });
};

var process_logs = function process_logs(b_number, logs) {
  logs = logs || [];
  console.log("Processing " + logs.length + " event" + (logs.length == 1 ? '' : 's'));
  var txs = {};
  logs.forEach(function (l) {
    var formatted = logs_formatter(l);
    _LogUtils2.default.to_sorted_event(txs, formatted);
    if (formatted.event === 'PixelPainted') {
      update_pixel(formatted);
      update_buffer(formatted);
    }
  });
  console.log("Storing block " + b_number);
  admin.database().ref("blocks/" + b_number).set(logs.length ? txs : 0);
  update_cache();
};

var process_past_logs = function process_past_logs(start, end) {
  console.log("Fetching logs from " + start + " to " + end);
  provider.sendAsync({
    method: 'eth_getLogs',
    params: [{
      fromBlock: "0x" + start.toString(16),
      toBlock: "0x" + end.toString(16),
      address: instance.address
    }]
  }, function (_, response) {
    return process_logs(end, response.result);
  });
};

var reset_cache = function reset_cache(g_block, b_number) {
  console.log("Resetting cache...");
  admin.database().ref('blocks').set(null);
  max_index = -1;
  last_cache_block = g_block;
  process_new_block(b_number);
  start_watching();
};

var continue_cache = function continue_cache(b_number, buffer_data, pixels_data, prices_data) {
  console.log('Using stored cache...');
  /* init the canvas with the last cached image */
  var img = new Canvas.Image();
  img.src = "data:image/png;base64," + Buffer.from(pixels_data).toString('base64');
  console.log("Last cache dimensions: " + img.width + "x" + img.height);
  var temp_canvas = new Canvas(img.width, img.height);
  pixel_buffer_ctx = temp_canvas.getContext('2d');
  pixel_buffer_ctx.drawImage(img, 0, 0);
  /* init the prices canvas with the last cached image */
  img.src = "data:image/png;base64," + Buffer.from(prices_data).toString('base64');
  temp_canvas = new Canvas(img.width, img.height);
  prices_ctx = temp_canvas.getContext('2d');
  prices_ctx.drawImage(img, 0, 0);
  /* init the buffer with the last cached buffer */
  address_buffer = zlib.inflateRawSync(buffer_data);
  max_index = _ContractToWorld2.default.max_index(last_cache_block); /* temp set mat_index to old_index to set old_index to the right value */
  var old_index = store_new_index(b_number);
  resize_assets(old_index);
  start_watching();
};

var fetch_current_block = function fetch_current_block() {
  return new Promise(function (resolve, reject) {
    provider.sendAsync({
      method: 'eth_blockNumber',
      params: []
    }, function (err, res) {
      if (err) reject(err);else resolve(parseInt(res.result, 16) - process.env.CONFIRMATIONS_NEEDED);
    });
  });
};

init_provider();
canvasContract.setProvider(provider);
canvasContract.deployed().then(function (contract_instance) {
  var matching_contract = false;
  instance = contract_instance;
  console.log("Contract deployed\nFetching halving information...");
  instance.HalvingInfo.call().then(function (halving_info) {
    var g_block = halving_info[0].toNumber();
    _ContractToWorld2.default.init(halving_info);
    console.log("Halving array: " + halving_info + "\nFetching initial data...");
    fetch_current_block().then(function (b_number) {
      Promise.all([bucket_ref.file(init_file_name).download(), bucket_ref.file(buffer_file_name).download(), bucket_ref.file(pixels_file_name).download(), bucket_ref.file(prices_file_name).download()]).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 4),
            init_data = _ref2[0],
            buffer_data = _ref2[1],
            pixels_data = _ref2[2],
            prices_data = _ref2[3];

        init_data = init_data[0];
        buffer_data = buffer_data[0];
        pixels_data = pixels_data[0];
        prices_data = prices_data[0];
        var json_data = JSON.parse(init_data.toString());
        last_cache_block = json_data.last_cache_block;
        console.log("Last block cached: " + last_cache_block);
        var cache_address = json_data.contract_address;
        if (cache_address === instance.address) continue_cache(b_number, buffer_data, pixels_data, prices_data);else {
          console.log('Last cache files point to older contract version, resetting cache...');
          reset_cache(g_block, b_number);
        }
      }).catch(function (err) {
        console.log(err);
        reset_cache(g_block, b_number);
      });
    });
  });
});

setInterval(function () {
  var a = 0;
}, 99999999999);
