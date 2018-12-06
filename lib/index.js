var DD = require("node-dogstatsd").StatsD;

module.exports = function (options) {
	var datadog = options.dogstatsd || new DD();
	var stat = options.stat || "node.express.router";
	var tags = options.tags || [];
	var path = options.path || false;
	var base_url = options.base_url || false;
	var response_code = options.response_code || false;
	var response_code_class = options.response_code_class || false;
	if (options.response_code_grouped !== undefined) {
		if (options.response_code_class === undefined) {
			response_code_class = options.response_code_grouped;
			console.warn('response_code_grouped is deprecated.  Use ' +
				'response_code_class option. Setting response_code_class ' +
				'to: ' + response_code_class)
		} else {
			console.warn('response_code_grouped is deprecated, ignoring it and ' +
				'using response_code_class option.')
		}
	}

	return function (req, res, next) {
		if (!req._startTime) {
			req._startTime = new Date();
		}

		var end = res.end;
		res.end = function (chunk, encoding) {
			res.end = end;
			res.end(chunk, encoding);

			if (!req.route || !req.route.path) {
				return;
			}

			var baseUrl = (base_url !== false) ? req.baseUrl : '';
			var statTags = [
				"route:" + baseUrl + req.route.path
			].concat(tags);

			if (options.method) {
				statTags.push("method:" + req.method.toLowerCase());
			}

			if (options.protocol && req.protocol) {
				statTags.push("protocol:" + req.protocol);
			}

			if (path !== false) {
				statTags.push("path:" + baseUrl + req.path);
			}

			if (response_code || response_code_class) {
				statTags.push("response_code:" + res.statusCode);
			}

			if (response_code) {
				datadog.increment(stat + '.response_code.' + res.statusCode , 1, statTags);
				datadog.increment(stat + '.response_code.all' , 1, statTags);
			}

			if (response_code_class) {
				var statusCodeClass = res.statusCode.toString()[0] + 'xx'
				datadog.increment(stat + '.response_code.' + statusCodeClass , 1, statTags);
			}

			datadog.histogram(stat + '.response_time', (new Date() - req._startTime), 1, statTags);
		};

		next();
	};
};
