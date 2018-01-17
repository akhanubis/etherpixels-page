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

var fs = require('fs');
var zlib = require('zlib');
var Canvas = require('canvas');
var ProviderEngine = require('web3-provider-engine');
var ZeroClientProvider = require('web3-provider-engine/zero.js');
var contract = require('truffle-contract');
var canvasContract = contract(_Canvas2.default);

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
var file_path = process.env.FILE_DIR + "/pixels.png";
var json_file_path = process.env.FILE_DIR + "/init.json";

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
      rpcUrl: 'https://ropsten.infura.io/koPGObK3IvOlTaqovf2G',
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
  fs.writeFileSync(file_path, canvas.toBuffer(), 'binary');
  fs.writeFileSync(json_file_path, "{ \"last_cache_block\": " + current_block /* -1 ????? */ + " }", 'utf8');
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

web3 = get_web3();
canvasContract.setProvider(web3.currentProvider);
canvasContract.deployed().then(function (instance) {
  console.log("Contract deployed\nFetching genesis block...");
  instance.GenesisBlock.call().then(function (g_block) {
    genesis_block = g_block;
    console.log("Genesis block: " + g_block + "\nFetching init.json...");
    fs.readFile(json_file_path, function (error, json_data) {
      if (error) {
        console.log('File init.json not found, setting last_cache_block to genesis_block');
        last_cache_block = g_block;
      } else {
        last_cache_block = JSON.parse(json_data).last_cache_block;
        console.log("Last block cached: " + last_cache_block);
      }
      console.log('Fetching current block...');
      web3.eth.getBlockNumber(function (error, b_number) {
        if (error) throw error;else {
          store_new_index(b_number);
          canvas = new Canvas(canvas_dimension, canvas_dimension);
          pixel_buffer_ctx = canvas.getContext('2d');
          console.log("Reading " + file_path + "...");
          fs.readFile(file_path, function (error, file_data) {
            if (error) {
              console.log('Last cache file not found');
              resize_canvas(-1);
            } else {
              var img = new Canvas.Image();
              img.src = file_data;
              console.log("Last canvas dimensions: " + img.width + "x" + img.height);
              var offset = 0.5 * (canvas_dimension - img.width);
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
            var pixel_sold_event = instance.PixelSold({}, { fromBlock: last_cache_block, toBlock: 'latest' });
            pixel_sold_event.watch(pixel_sold_handler);
            pixel_sold_event.get(pixel_sold_handler);

            web3.eth.filter("latest").watch(function (error, block_hash) {
              web3.eth.getBlock(block_hash, function (error, result) {
                if (error) console.error(error);else if (result.number > current_block) process_new_block(result.number);
              });
            });

            setInterval(function () {
              console.log("Listening for events...");
            }, 60000);
          });
        }
      });
    });
  });
});
