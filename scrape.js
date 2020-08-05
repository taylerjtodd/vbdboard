
var SCRAPE = (function () {
	function scrape(pos) {
		var length = 50;
		switch (pos) {
			case 'qb':
				length = 25;
				break;
			case 'rb':
				length = 75;
				break;
			case 'wr':
				length = 87;
				break;
			case 'te':
				length = 25;
				break;
			case 'k':
				length = 15;
				break;
			case 'dst':
				length = 15;
				break;
		}

		var retArr = [];
		$('table').find('tr').each(function (i, row) {
			if (['rb', 'wr', 'qb', 'te'].includes(pos) && i < 2 || ['k', 'dst'].includes(pos) && i < 1) {
				return;
			}
			if (i > length + 1) {
				return;
			}
			var cols = $(this).find('td');

			var retVal = {};
			retVal.name = $(cols[0]).find('a').text().replace("'", '');
			retVal.position = pos;
			retVal.points = $(cols[cols.length - 1]).text();
			retVal.ppg = Math.round(retVal.points / 1.6) / 10;
			retVal.tier = 0;
			retArr.push(retVal);
		});
		console.log('projections.' + pos + ' = ' + JSON.stringify(retArr));

	}

	function ranks() {

		var retArr = [];
		var currentTier = '';
		$('#rank-data').find('tr').each(function (i, row) {
			if (i < 2) {
				return;
			}
			var cols = $(this).find('td');

			if ($(cols[0]).html().includes('Tier')) {
				currentTier = $(cols[0]).html().substr(5);
				return;
			}

			if (cols.length < 4) {
				return;
			}

			var retVal = {};
			retVal.name = $(cols[2]).find('a').find('span').html().replace("'", '');
			retVal.rank = $(cols[7]).html();
			retVal.adp = $(cols[9]).html();
			switch ($(cols[3]).html().substr(0, 2)) {
				case 'QB': retVal.pos = 'qb'; break;
				case 'RB': retVal.pos = 'rb'; break;
				case 'WR': retVal.pos = 'wr'; break;
				case 'TE': retVal.pos = 'te'; break;
				case 'DS': retVal.pos = 'dst'; break;
				default: retVal.pos = 'k'; break;
			}
			retVal.tier = currentTier;
			retArr.push(retVal);
		});
		console.log('var ranks = ' + JSON.stringify(retArr));

	}

	return {
		qbs: function () {
			scrape('qb');
		},
		rbs: function () {
			scrape('rb');
		},
		wrs: function () {
			scrape('wr');
		},
		tes: function () {
			scrape('te');
		},
		ks: function () {
			scrape('k');
		},
		dsts: function () {
			scrape('dst');
		},
		ranks: ranks
	}
})();
