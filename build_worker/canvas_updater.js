"use strict";

var _Canvas = require("../build/contracts/Canvas.json");

var _Canvas2 = _interopRequireDefault(_Canvas);

var _web = require("web3");

var _web2 = _interopRequireDefault(_web);

var _ColorUtils = require("./utils/ColorUtils.js");

var _ColorUtils2 = _interopRequireDefault(_ColorUtils);

var _ContractToWorld = require("./utils/ContractToWorld.js");

var _ContractToWorld2 = _interopRequireDefault(_ContractToWorld);

var _WorldToCanvas = require("./utils/WorldToCanvas.js");

var _WorldToCanvas2 = _interopRequireDefault(_WorldToCanvas);

var _CanvasUtils = require("./utils/CanvasUtils.js");

var _CanvasUtils2 = _interopRequireDefault(_CanvasUtils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('dotenv').config({ silent: true });

var fs = require('fs');
var zlib = require('zlib');
var Canvas = require('canvas');
var left_pad = require('left-pad');
var ProviderEngine = require('web3-provider-engine');
var ZeroClientProvider = require('web3-provider-engine/zero.js');
var contract = require('truffle-contract');
var canvasContract = contract(_Canvas2.default);
var Pusher = require('pusher');
var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var buffer_entry_size = 29; /* 20 bytes for address, 9 bytes for price */
var free_pixel_buffer = Buffer.allocUnsafe(buffer_entry_size).fill('0000000000000000000000000000000000000000000000000000000000', 'hex'); /* empty address and price */
var new_pixel_image_data = _CanvasUtils2.default.semitrans_image_data(Canvas.ImageData);

var canvas = null;
var canvas_dimension = null;
var pixel_buffer_ctx = null;
var address_buffer = new Buffer(0);
var genesis_block = null;
var last_cache_block = null;
var current_block = null;
var max_index = null;
var web3 = null;
var instance = null;
var pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || process.env.REACT_APP_PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY || process.env.REACT_APP_PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET || process.env.REACT_APP_PUSHER_APP_SECRET,
  encrypted: true
});

var bucket = process.env.REACT_APP_S3_BUCKET;
var pixels_key = 'pixels.png';
var buffer_key = 'addresses.buf';
var init_key = 'init.json';

var get_web3 = function get_web3() {
  var provider = null;
  if (process.env.NODE_ENV === 'development') {
    console.log('Using development web3');
    provider = new _web2.default.providers.HttpProvider('http://127.0.0.1:9545');
  } else {
    console.log('Using Infura');
    provider = ZeroClientProvider({
      static: {
        eth_syncing: false,
        web3_clientVersion: 'ZeroClientProvider'
      },
      pollingInterval: 99999999, // not interested in polling for new blocks
      rpcUrl: "https://ropsten.infura.io/" + process.env.REACT_APP_INFURA_API_KEY,
      getAccounts: function getAccounts(cb) {
        return cb(null, []);
      }
    });
    provider.start();
  }
  return new _web2.default(provider);
};

var upload_callback = function upload_callback(err, data) {
  if (err) console.log(err);else console.log("New " + data.key + ": " + data.ETag);
};

var update_cache = function update_cache() {
  console.log("Updating cache...");
  s3.upload({ ACL: 'public-read', Bucket: bucket, Key: pixels_key, Body: canvas.toBuffer() }, upload_callback);
  var init_json = JSON.stringify({ contract_address: instance.address, last_cache_block: current_block });
  s3.upload({ ACL: 'public-read', Bucket: bucket, Key: init_key, Body: init_json }, upload_callback);
  var deflated_body = zlib.deflateRawSync(address_buffer);
  s3.upload({ ACL: 'public-read', Bucket: bucket, Key: buffer_key, Body: deflated_body }, upload_callback);
};

var process_new_block = function process_new_block(b_number) {
  console.log("New block: " + b_number);
  var old_dimension = canvas_dimension;
  var old_index = store_new_index(b_number);
  resize_assets(old_index);
};

var process_pixel_solds = function process_pixel_solds(pixel_solds) {
  console.log("Processing " + pixel_solds.length + " pixel" + (pixel_solds.length == 1 ? '' : 's'));
  pixel_solds.forEach(function (log) {
    //TODO: mandar email a old_owner
    update_pixel(log);
    update_buffer(log);
  });
  update_cache();
  //TODO GUARDAR EN UN BUFFER LOS ULTIMOS 100 eventos asi desp de recibir este push el cliente los busca
  pusher.trigger('main', 'new_block', { new_block: current_block, events: pixel_solds });
};

var update_pixel = function update_pixel(log) {
  var world_coords = new _ContractToWorld2.default(log.args.i.toNumber()).get_coords();
  var canvas_coords = _WorldToCanvas2.default.to_buffer(world_coords.x, world_coords.y, { width: canvas_dimension, height: canvas_dimension });
  var pixel_array = new Uint8ClampedArray(_ColorUtils2.default.bytes3ToIntArray(log.args.new_color));
  var image_data = new Canvas.ImageData(pixel_array, 1, 1);
  pixel_buffer_ctx.putImageData(image_data, canvas_coords.x, canvas_coords.y);
};

var update_buffer = function update_buffer(log) {
  var offset = buffer_entry_size * log.args.i.toNumber();
  var formatted_address = log.args.new_owner.substr(2, 40);
  var formatted_price = left_pad(log.args.price.toString(16), 18, 0);
  var entry = formatted_address + formatted_price;
  address_buffer.fill(entry, offset, offset + buffer_entry_size, 'hex');
};

var pixel_sold_handler = function pixel_sold_handler(error, result) {
  if (error) console.error(error);else {
    if (result.transactionHash) // event, not log
      result = [result];
    process_pixel_solds(result);
  }
};

var store_new_index = function store_new_index(b_number) {
  var old_index = max_index;
  current_block = b_number;
  max_index = _ContractToWorld2.default.max_index(genesis_block, current_block);
  canvas_dimension = _ContractToWorld2.default.canvas_dimension(max_index);
  return old_index;
};

var resize_canvas = function resize_canvas(old_i) {
  console.log("Resizing canvas to: " + canvas_dimension + "x" + canvas_dimension + "...");
  canvas = new Canvas(canvas_dimension, canvas_dimension); /* pixel_buffer_ctx keeps a temp reference to old canvas */
  pixel_buffer_ctx = _CanvasUtils2.default.resize_canvas(pixel_buffer_ctx, canvas, { width: canvas_dimension, height: canvas_dimension }, old_i, max_index, new_pixel_image_data);
};

var resize_buffer = function resize_buffer(old_i) {
  console.log("Resizing buffer to: " + buffer_entry_size * (max_index + 1) + "...");
  address_buffer = Buffer.concat([address_buffer, Buffer.allocUnsafe(buffer_entry_size * (max_index - old_i)).fill(free_pixel_buffer)], buffer_entry_size * (max_index + 1));
};

var resize_assets = function resize_assets(old_i) {
  console.log("Resizing assets: " + old_i + " => " + max_index + "...");
  resize_canvas(old_i);
  resize_buffer(old_i);
};

var start_watching = function start_watching() {
  process_past_logs(last_cache_block);

  web3.eth.filter("latest").watch(function (error, block_hash) {
    web3.eth.getBlock(block_hash, function (error, result) {
      if (error) console.error(error);else if (result.number > current_block) {
        process_new_block(result.number);
        process_past_logs(current_block);
      }
    });
  });
};

var process_past_logs = function process_past_logs(last_processed_block) {
  console.log("Fetching events since " + last_processed_block + "...");
  instance.PixelSold({}, { fromBlock: last_processed_block, toBlock: 'latest' }).get(pixel_sold_handler);
};

var reset_cache = function reset_cache(b_number) {
  console.log("Resetting cache...");
  max_index = -1;
  last_cache_block = genesis_block;
  process_new_block(b_number);
  start_watching();
};

var continue_cache = function continue_cache(b_number, pixels_data, buffer_data) {
  console.log('Using stored cache...');
  /* init the canvas with the last cached image */
  var img = new Canvas.Image();
  img.src = "data:image/png;base64," + Buffer.from(pixels_data).toString('base64');
  console.log("Last cache dimensions: " + img.width + "x" + img.height);
  canvas = new Canvas(img.width, img.height);
  pixel_buffer_ctx = canvas.getContext('2d');
  pixel_buffer_ctx.drawImage(img, 0, 0);
  /* init the buffer with the last cached buffer */
  address_buffer = zlib.inflateRawSync(buffer_data);
  max_index = _ContractToWorld2.default.max_index(genesis_block, last_cache_block); /* temp set mat_index to old_index to set old_index to the right value */
  var old_index = store_new_index(b_number);
  resize_assets(old_index);
  start_watching();
};

var fetch_pixels = function fetch_pixels(b_number) {
  console.log("Reading " + bucket + "/" + pixels_key + "...");
  s3.getObject({ Bucket: bucket, Key: pixels_key }, function (error, pixels_data) {
    if (error) {
      console.log('Last pixels file not found');
      reset_cache(b_number);
    } else fetch_buffer(b_number, pixels_data.Body);
  });
};

var fetch_buffer = function fetch_buffer(b_number, pixels_data) {
  console.log("Reading " + bucket + "/" + buffer_key + "...");
  s3.getObject({ Bucket: bucket, Key: buffer_key }, function (error, buffer_data) {
    if (error) {
      console.log('Last buffer file not found');
      reset_cache(b_number);
    } else continue_cache(b_number, pixels_data, buffer_data.Body);
  });
};

web3 = get_web3();
canvasContract.setProvider(web3.currentProvider);
canvasContract.deployed().then(function (contract_instance) {
  var matching_contract = false;
  instance = contract_instance;
  console.log("Contract deployed\nFetching genesis block...");
  instance.GenesisBlock.call().then(function (g_block) {
    genesis_block = g_block;
    console.log("Genesis block: " + g_block + "\nFetching init.json...");
    s3.getObject({ Bucket: bucket, Key: init_key }, function (error, data) {
      if (error) console.log('File init.json not found');else {
        var json_data = JSON.parse(data.Body.toString());
        last_cache_block = json_data.last_cache_block;
        console.log("Last block cached: " + last_cache_block);
        var cache_address = json_data.contract_address;
        matching_contract = cache_address === instance.address;
      }
      console.log('Fetching current block...');
      web3.eth.getBlockNumber(function (error, b_number) {
        if (error) throw error;else {
          if (matching_contract) fetch_pixels(b_number);else {
            console.log('Last cache files point to older contract version, resetting cache...');
            reset_cache(b_number);
          }
          setInterval(function () {
            console.log("Listening for events...");
          }, 60000);
        }
      });
    });
  });
});
