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
var ProviderEngine = require('web3-provider-engine');
var ZeroClientProvider = require('web3-provider-engine/zero.js');
var contract = require('truffle-contract');
var canvasContract = contract(_Canvas2.default);
var AWS = require('aws-sdk');
var s3 = new AWS.S3();

var owner_canvas = null;
var canvas = null;
var canvas_dimension = null;
var pixel_buffer_ctx = null;
var owner_ctx = null;
var genesis_block = null;
var last_cache_block = null;
var current_block = null;
var max_index = null;
var web3 = null;
var instance = null;

var bucket = process.env.REACT_APP_S3_BUCKET;
var pixels_key = 'pixels.png';
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

var write_file = function write_file() {
  console.log("Updating files...");
  s3.upload({ ACL: 'public-read', Bucket: bucket, Key: pixels_key, Body: canvas.toBuffer() }, function (err, data) {
    if (err) console.log(err);else console.log("New pixels.png: " + data.ETag);
  });
  var init_json = JSON.stringify({ contract_address: instance.address, last_cache_block: current_block /* restarle 1 ????? */ });
  s3.upload({ ACL: 'public-read', Bucket: bucket, Key: init_key, Body: init_json }, function (err, data) {
    if (err) console.log(err);else console.log("New init.json: " + data.ETag);
  });
};

var process_new_block = function process_new_block(b_number) {
  var old_dimension = canvas_dimension;
  var old_index = store_new_index(b_number);
  console.log("New canvas dimensions: " + canvas_dimension + "x" + canvas_dimension + "\nNew canvas index: " + max_index);
  resize_canvas(old_index);
};

var process_pixel_solds = function process_pixel_solds(pixel_solds) {
  console.log("Processing " + pixel_solds.length + " pixels");
  pixel_solds.forEach(function (log) {
    var world_coords = new _ContractToWorld2.default(log.args.i.toNumber()).get_coords();
    var canvas_coords = _WorldToCanvas2.default.to_buffer(world_coords.x, world_coords.y, { width: canvas_dimension, height: canvas_dimension });
    var pixel_array = new Uint8ClampedArray(_ColorUtils2.default.bytes3ToIntArray(log.args.new_color));
    var image_data = new Canvas.ImageData(pixel_array, 1, 1);
    pixel_buffer_ctx.putImageData(image_data, canvas_coords.x, canvas_coords.y);
    //TODO: mandar email a old_owner
    var owner = log.args.new_owner;
    var price = log.args.price;
  });
};

var pixel_sold_handler = function pixel_sold_handler(error, result) {
  if (error) console.error(error);else if (result.transactionHash) // event, not log
    result = [result];
  process_pixel_solds(result);
};

var buffer_to_array_buffer = function buffer_to_array_buffer(b) {
  // TypedArray
  return new Uint32Array(b.buffer, b.byteOffset, b.byteLength / Uint32Array.BYTES_PER_ELEMENT);
};

var store_new_index = function store_new_index(b_number) {
  var old_index = max_index;
  current_block = b_number;
  console.log("Current block:" + current_block);
  max_index = _ContractToWorld2.default.max_index(genesis_block, current_block);
  canvas_dimension = _ContractToWorld2.default.canvas_dimension(max_index);
  return old_index;
};

var resize_canvas = function resize_canvas(old_i) {
  canvas = new Canvas(canvas_dimension, canvas_dimension); /* pixel_buffer_ctx keeps a temp reference to old canvas */
  _CanvasUtils2.default.resize_canvas(pixel_buffer_ctx, canvas, { width: canvas_dimension, height: canvas_dimension }, old_i, max_index, Canvas.ImageData, function (new_ctx) {
    pixel_buffer_ctx = new_ctx;
    write_file();
  });
};

var start_watching = function start_watching() {
  var pixel_sold_event = instance.PixelSold({}, { fromBlock: last_cache_block, toBlock: 'latest' });
  pixel_sold_event.watch(pixel_sold_handler);
  pixel_sold_event.get(pixel_sold_handler);

  web3.eth.filter("latest").watch(function (error, block_hash) {
    web3.eth.getBlock(block_hash, function (error, result) {
      if (error) console.error(error);else if (result.number > current_block) process_new_block(result.number);
    });
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
      if (error) {
        console.log('File init.json not found, setting last_cache_block to genesis_block');
        last_cache_block = g_block;
      } else {
        var json_data = JSON.parse(data.Body.toString());
        last_cache_block = json_data.last_cache_block;
        console.log("Last block cached: " + last_cache_block);
        var cache_address = json_data.contract_address;
        matching_contract = cache_address === instance.address;
      }
      console.log('Fetching current block...');
      web3.eth.getBlockNumber(function (error, b_number) {
        if (error) throw error;else {
          if (last_cache_block > b_number) {
            console.log('Last cache file seems to point to older contract version, ignoring...');
            resize_canvas(-1);
            start_watching();
          } else {
            store_new_index(b_number);
            canvas = new Canvas(canvas_dimension, canvas_dimension);
            pixel_buffer_ctx = canvas.getContext('2d');
            console.log('Cache');
            if (matching_contract) {
              console.log("Reading " + bucket + "/" + pixels_key + "...");
              s3.getObject({ Bucket: bucket, Key: pixels_key }, function (error, pixels_data) {
                if (error) {
                  console.log('Last cache file not found');
                  resize_canvas(-1);
                } else {
                  var last_cache_dimension = _ContractToWorld2.default.canvas_dimension(_ContractToWorld2.default.max_index(genesis_block, last_cache_block));
                  console.log("Last cache dimensions: " + last_cache_dimension + "x" + last_cache_dimension);
                  var offset = 0.5 * (canvas_dimension - last_cache_dimension);
                  var img = new Canvas.Image();
                  img.src = "data:image/png;base64," + Buffer.from(pixels_data.Body).toString('base64');
                  pixel_buffer_ctx.drawImage(img, offset, offset);
                  /*
                  fs.readFile('public/owners.png', (e2, file_data2) => {
                    console.log(file_data2.length)
                    let buffer = zlib.deflateSync(file_data2)
                    console.log(buffer.length)
                    //console.log(buffer_to_array_buffer(file_data2))
                    //owner_data = file_data2
                  })*/
                }
                start_watching();
              });
            } else {
              console.log('Last cache file points to older contract version, ignoring...');
              resize_canvas(-1);
              start_watching();
            }
          }
          setInterval(function () {
            console.log("Listening for events...");
          }, 60000);
        }
      });
    });
  });
});
