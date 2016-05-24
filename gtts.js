(function(_window){
  'use strict';

/*

NOTE: node-webkit audio problem. need proprietary [lib]ffmpegsumo.* from google-chrome
[10480:0516/200948:ERROR:audio_manager_base.cc(422)] Not implemented reached in virtual std::string media::AudioManagerBase::GetDefaultOutputDeviceID()

 */

  ///////////////////////////

  var
  os   = require('os'),
  path = require('path'),
  fs   = require('fs'),
  request = require('request'),
  qs   = require('querystring'),
  exec = require('child_process').exec,
  md5  = require('blueimp-md5').md5,

  // win32 specific hacks
  platform = os.platform(), // 'win32' 'linux' 'darwin'
  arch = os.arch(), // 'ia32' 'x64'
  cwd,
  mpg123bin = 'mpg123',
  silence;


  // try{
  //   buzz = require('node-buzz');
  //   if(!buzz.isSupported() || !buzz.isMP3Supported()){
  //     console.log('*** node-buzz: audio not supported');
  //     delete buzz;
  //   }
  // }catch(e){console.log('*** node-buzz: loading error:',e);}


  try {
    cwd = require('process').cwd();
  }catch(e){
    cwd  = process.cwd(); // node-webkit no require('process')
  };

  console.log('gtts-env:',{platform:platform,arch:arch,cwd:cwd});

  if(os.platform() == 'win32'){
    if(os.arch() == 'ia32'){
      mpg123bin = path.resolve(cwd,'./node_modules/kmkr-gtts/bin/win32_ia32/mpg123.exe');
    }
    if(os.arch() == 'x64'){
      mpg123bin = path.resolve(cwd,'./node_modules/kmkr-gtts/bin/win64_x64/mpg123.exe');
    }
  }

  silence = path.resolve(cwd,'./node_modules/kmkr-gtts/bin/res/silence.mp3');

  ///////////////////////////

  function gtts(dir,opts){
    if(!fs.existsSync(dir))fs.mkdirSync(dir);
    if(!fs.existsSync(dir))console.log('*** error:','cannot create cache dir');
    this.cachedir = dir;
    this.cachedir_absolute = path.resolve(cwd,this.cachedir)+'/';
    console.log('gtts: cachedir:',this.cachedir_absolute);
  };

  gtts.prototype._soundfile = function(str){
    var key = md5(str),cachefile = this.cachedir_absolute + key + ".mp3";
    return cachefile;
  };

  gtts.prototype._playAudio = function(cachefile,callback){
    var cmd;
    if(! (typeof buzz == 'undefined') ){
      console.log('=== play_buzz:',cachefile);
      new buzz.sound(
	cachefile,
	{
	  //formats:["mp3"],
	  autoplay:true,
	  loop:false
	})
	.play()
      //.fadeIn()
	.bind('error',function(e){
	  callback(this.error);
	})
	.bind('ended',function(e){
	  callback();
	});
    }else{
      console.log('=== play_mpg123:',cachefile);
      cmd=mpg123bin+' -q "'+cachefile+'"';
      exec(
	cmd,
	function(err,stdout,stderr){
	  if(err){
	    console.log('*** _playAudio:',err,cmd,stdout,stderr);
	    return;
	  }
	  if(callback)callback(err);
	}.bind(this));
    }
  };

  gtts.prototype._say = function(str,callback){
    var cachefile = this._soundfile(str),cmd,params;

    if(!fs.existsSync(cachefile)){

      // curl.request(
      // 	opts,
      //   function(err,result){
      //     var buffer,fd;
      //     if(err){
      //       console.log('*** curl error:',err,opts);
      //       return;
      //     }
      //     buffer=result; //new Buffer(result,'binary');
      //     fd=fs.openSync(cachefile,'w');
      //     fs.writeSync(fd,buffer,0,buffer.length,0);
      //     fs.closeSync(fd);
      //     this._playAudio(cachefile,callback);
      //   }.bind(this));

      params = {
        q:str,
        ie:'UTF-8',
        tl:'ko'
      };

      request(
	{
	  url:'http://translate.google.com/translate_tts'+'?'+qs.stringify(params),
	  headers:{
	    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36'
	  }
	}
      ).pipe(fs.createWriteStream(cachefile))
	.on('close'/*'end'*/,function(){
          this._playAudio(cachefile,callback);
	}.bind(this));

    }else{
      this._playAudio(cachefile,callback);
    }
  };

  gtts.prototype.say = function (strlist){
    if(strlist.length>0){
      var me = this;
      me._playAudio(silence,function(err){
	var first=strlist[0],rest=strlist.slice(1);
	me._say(first,function(err){
	  me.say(rest);
	});
      });
    }
  };

  ////////////////////////////////

  if (('undefined' !== typeof module) && module.exports) {
    // Publish as node.js module
    module.exports = gtts;
  } else if (typeof define === 'function' && define.amd) {
    // Publish as AMD module
    define(function() {return gtts;});
  } else {
    // Publish as global (in browsers)
    _previousRoot = _window.gtts;
    // **`noConflict()` - (browser only) to reset global 'gtts' var**
    gtts.noConflict = function() {
      _window.gtts = _previousRoot;
      return gtts;
    };
    _window.gtts = gtts;
  }

})('undefined' !== typeof window ? window : null);
