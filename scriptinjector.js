var HTMLPreview = {

	content: '',

	previewform: document.getElementById('previewform'),

  // from http://stackoverflow.com/a/5448635/9621
  extractUrlParam: function (name) {
    var prmstr = window.location.search.substr(1);
    var prmarr = prmstr.split ("&");
    var params = {};

    for ( var i = 0; i < prmarr.length; i++) {
          var tmparr = prmarr[i].split("=");
              params[tmparr[0]] = tmparr[1];
    }
    return params[name];
  },

	file: function() {
		return this.extractUrlParam('page'); // 
    // return location.search.substring(1); //Get everything after the ?
	},

	script: function() {
		return this.extractUrlParam('script'); // 
    // return location.search.substring(1); //Get everything after the ?
	},

	raw: function() {
		// return this.file().replace(/\/\/github\.com/,'//raw.github.com').replace(/\/blob\//,'/'); //Get URL of the raw file
    return this.file();
	},

	folder: function() {
		return this.raw().replace(/[^\/]+$/g,''); //Remove file name from the end of URL
	},

	replaceAssets: function() {
		var link, script, frame, a, i, href, src;
		link = document.getElementsByTagName('link');
		for(i = 0; i < link.length; ++i) {
			if(link[i].rel
			&& link[i].rel.toLowerCase() == 'stylesheet'
			&& link[i].href) {
				href = link[i].href; //Get absolute URL
				if(href.indexOf('//raw.github.com') > 0 || href.indexOf('//bitbucket.org') > 0) { //Check if it's from raw.github.com or bitbucket.org
					this.send(href, 'loadCSS'); //Then load it using YQL
				}
			}
		}
		if(/*@cc_on!@*/0) { //Replace scripts only in IE
			script = document.getElementsByTagName('script');
			for(i = 0; i < script.length; ++i) {
				if(script[i].src) {
					src = script[i].src; //Get absolute URL
					if(src.indexOf('//raw.github.com') > 0 || href.indexOf('//bitbucket.org') > 0) { //Check if it's from raw.github.com or bitbucket.org
						this.send(src, 'loadJS'); //Then load it using YQL
					}
				}
			}
		}
		frame = [].slice.call(document.getElementsByTagName('iframe')).concat([].slice.call(document.getElementsByTagName('frame')));
		for(i = 0; i < frame.length; ++i) {
			if(frame[i].src) {
				src = frame[i].src; //Get absolute URL
				if(src.indexOf('//raw.github.com') > 0 || src.indexOf('//bitbucket.org') > 0) { //Check if it's from raw.github.com or bitbucket.org
					frame[i].src = 'http://' + location.hostname + location.pathname + '?' + src; //Then rewrite URL so it can be loaded using YQL
				}
			}
		}
		a = document.getElementsByTagName('a');
		for(i = 0; i < a.length; ++i) {
			if(a[i].href) {
				href = a[i].href; //Get absolute URL
				if(href.indexOf('#') > 0) { //Check if it's an anchor
					a[i].href = 'http://' + location.hostname + location.pathname + location.search + '#' + a[i].hash.substring(1); //Then rewrite URL with support for empty anchor
				}
				else if(href.indexOf('//raw.github.com') > 0 || href.indexOf('//bitbucket.org') > 0) { //Check if it's from raw.github.com or bitbucket.org
					a[i].href = 'http://' + location.hostname + location.pathname + '?' + href; //Then rewrite URL so it can be loaded using YQL
				}
			}
		}
	},

  injectScripts: function(content) {
			this.content = content
        .replace(/<head>/i,'<head><base href="'+this.folder()+'">')
        .replace(/<\/body>/i,'<script src="' + location.origin + location.pathname + '/scriptinjector.js"></script><script>HTMLPreview.replaceAssets();</script></body>')
        .replace(/<\/body>/i,'<script src="' + this.script() + '"></script><script>HTMLPreview.replaceAssets();</script></body>')
        .replace(/<\/head>\s*<frameset/gi,'<script src="' + location.origin + location.pathname + '/scriptinjector.js"></script><script>document.addEventListener("DOMContentLoaded",HTMLPreview.replaceAssets,false);</script></head><frameset'); 
  },

	loadHTML: function(data) {
		if(data
		&& data.query
		&& data.query.results
		&& data.query.results.resources
		&& data.query.results.resources.content
		&& data.query.results.resources.status == 200) {
      //Add <base> just after <head> and inject <script> just before </body> or </head> if <frameset>
			this.injectScripts(data.query.results.resources.content);
			// this.content = data.query.results.resources.content.replace(/<head>/i,'<head><base href="'+this.folder()+'">').replace(/<\/body>/i,'<script src="' + location.origin + '/scriptinjector.js"></script><script>HTMLPreview.replaceAssets();</script></body>').replace(/<\/head>\s*<frameset/gi,'<script src="' + location.origin + '/scriptinjector.js"></script><script>document.addEventListener("DOMContentLoaded",HTMLPreview.replaceAssets,false);</script></head><frameset'); 
			setTimeout(function() {
				document.open();
				document.write(HTMLPreview.content);
				document.close();
			}, 50); //Delay updating document to have it cleared before
		}
		else if(data
			 && data.error
			 && data.error.description) {
			this.previewform.innerHTML = data.error.description;
		}
		else
			this.previewform.innerHTML = 'Error: Cannot load file '+this.raw();
	},

	loadCSS: function(data) {
		if(data
		&& data.query
		&& data.query.results
		&& data.query.results.resources
		&& data.query.results.resources.content
		&& data.query.results.resources.status == 200) {
			document.write('<style>'+data.query.results.resources.content.replace(/\.\.\//g,'')+'</style>'); //Don't load assets from upper folders
		}		
	},

	loadJS: function(data) {
		if(data
		&& data.query
		&& data.query.results
		&& data.query.results.resources
		&& data.query.results.resources.content
		&& data.query.results.resources.status == 200) {
			document.write('<scr'+'ipt>'+data.query.results.resources.content+'</scr'+'ipt>');
		}		
	},

	send: function(file, callback) {
		document.write('<scr'+'ipt src="http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20data.headers%20where%20url%3D%22'+encodeURIComponent(file)+'%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=HTMLPreview.'+callback+'"></scr'+'ipt>'); //Get content using YQL
	},

	submitform: function() {
		location.href = location.pathname + '/?script=' + document.getElementById('script') + '&page=' + document.getElementById('file').value;
		return false;
	},

	init: function() {
		this.previewform.onsubmit = this.submitform;
		if(this.file()) {
			this.previewform.innerHTML = '<p>Loading...</p>';
			this.send(this.raw(), 'loadHTML');
		}
	}
}
