var APPLICATION = (function () {

    function init() {
        $('#body').html('Hello World');
        MODEL.init();


        let players = MODEL.players();

        players.sort((a, b) => a.adp - b.adp);


        for (pos in MODEL.config().starters) {

        }
        for (pos in MODEL.config().starters) {
            if (pos === 'flex') {
                continue;
            }
            let baseline = determineBaseline(pos, players);
            insertPointDif(MODEL.projections()[pos], baseline);
        }

        sortByValue(players);

        players.forEach(function (player, i) {
            player.vrank = i + 1;
            player.displayPosition = player.position + player.posrank;
            player.rank = parseInt(player.rank, 10);
        });
    }

    function determineBaseline(pos, players) {

        let starters = MODEL.config().starters;

        let replacementThreshold = starters.qb + starters.rb + starters.wr + starters.te + starters.flex + starters.dst + starters.k
        replacementThreshold *= MODEL.config().numTeams;

        for (index in players) {
            let player = players[index];
            if (player.adp > replacementThreshold && player.pos === pos) {
                return player;
            }
        }

    }

    function sortByValue(players) {
        const config = MODEL.config();
        let team = MODEL.team();
        let needFactor = {};
        let starters = config.starters;
        for(pos in starters) {
            if(pos === 'flex') continue;
            let startersForPos = starters[pos];
            if(pos === 'rb' || pos === 'wr') {
                startersForPos += starters.flex / 2.0
            }
            let surplus = team[pos].length - startersForPos;

            if(surplus > 0) {
                let expectedBenchRatio = startersForPos / config.numStarters;
                const expectedBenchCount = expectedBenchRatio * config.benchSize * 2;
                let rawNeed = expectedBenchCount - surplus;
                needFactor[pos] = rawNeed / expectedBenchCount
            } else {
                needFactor[pos] = 1
            }
        }

        players.sort(function (a, b) {
            return b.pointDif * needFactor[b.pos] - a.pointDif * needFactor[a.pos];
        });
    }

    function pad(num, size) {
        var s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }

    function insertPointDif(players, baseline) {
        players.forEach(function (player) {
            player.pointDif = player.ppg - baseline.ppg;
        });
        players.sort(function (a, b) {
            return b.pointDif - a.pointDif;
        });
        players.forEach(function (player, i) {
            player.posrank = pad(i + 1, 2);
        });
    };

    return {
        init: init
    };

})();