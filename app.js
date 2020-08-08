var APPLICATION = (function () {

    function init() {
        MODEL.init();

        let players = MODEL.players();

        players.sort((a, b) => a.adp - b.adp);
        let undraftedCount = 0;
        for (let index = 0; index < players.length; index++) {
            const player = players[index];
            if(undraftedCount === MODEL.config().numTeams * 2 + MODEL.drafted().length) {
                break;
            }
            if(!player.drafted) {
                player.adpWarning = true;
                undraftedCount++;
            }
        }

        let baselinePlayers = [];
        for (pos in MODEL.config().starters) {
            if (pos === 'flex') {
                continue;
            }
            let baseline = determineBaseline(pos, players);
            baselinePlayers.push(baseline.name);
            insertPointDif(MODEL.projections()[pos], baseline);
        }
        console.log(baselinePlayers);

        sortByValue(players);

        players.forEach(function (player, i) {
            player.vrank = i + 1;
            player.displayPosition = player.position + player.posrank;
            player.rank = parseInt(player.rank, 10);
        });

        window.addEventListener('hashchange', function () {
            render()
        }, false);

        render();

    }

    function render() {
        let hash = window.location.hash;
        if (!hash) {
            hash = "#board";
        }

        if (hash === "#board") {
            let players = MODEL.players();
            let template = $('#tableTemplate').html()
            var rendered = Mustache.render(template, { players: players });
            $('#body').html(rendered);
        } else if (hash === '#setup') {
            let template = $('#setupTemplate').html()
            var rendered = Mustache.render(template, {});
            $('#body').html(rendered);
        } else {
            let players = MODEL.players();
            let myPlayers = [];
            let team = MODEL.team();
            let addIfDrafted = draftedPlayer => {
                players.forEach(player => {
                    if (draftedPlayer.pos === 'dst' && draftedPlayer.pos === player.pos && draftedPlayer.name.substring(0, 6) === player.name.substring(0, 6)) {
                        myPlayers.push(player);
                    } else if (draftedPlayer.pos !== 'dst' && draftedPlayer.pos === player.pos && draftedPlayer.name === player.name) {
                        myPlayers.push(player);
                    }
                })
            };
            team.qb.forEach(addIfDrafted);
            team.rb.forEach(addIfDrafted);
            team.wr.forEach(addIfDrafted);
            team.te.forEach(addIfDrafted);
            team.k.forEach(addIfDrafted);
            team.dst.forEach(addIfDrafted);
            let template = $('#tableTemplate').html();
            var rendered = Mustache.render(template, { players: myPlayers, showAll: true });
            $('#body').html(rendered);
        }
    }

    function draft(playerName, pos, myTeam) {
        MODEL.drafted({ name: playerName, pos: pos }, myTeam);
        init();
    }

    function resetDraft() {
        MODEL.resetDraft();
        init();
    }

    function determineBaseline(pos, players) {

        // TODO this isn't quite right. QBs and TEs need to be dropped after one is picked

        const config = MODEL.config();
        let starters = config.starters;
        let draftedPlayers = MODEL.drafted().length;
        let totalNumDrafted = config.numTeams * config.rosterSize;

        let initialThreshold = starters.qb + starters.rb + starters.wr + starters.te + starters.flex + starters.dst + starters.k;
        initialThreshold *= MODEL.config().numTeams;

        let percentageDrafted = draftedPlayers/totalNumDrafted;
        let replacementThreshold = initialThreshold + (totalNumDrafted-initialThreshold) * percentageDrafted;

        let positionalIndex = -1;
        let draftedAtPosition = MODEL.drafted().filter(p => p.pos === pos).length;

        for (index in players) {
            let player = players[index];
            if(player.pos === pos) {
                positionalIndex++;
                if (player.adp > replacementThreshold && positionalIndex > draftedAtPosition) {
                    return player;
                }
            }
        }
        let allByPosition = MODEL.projections()[pos]
        return allByPosition[allByPosition.length-1];
    }

    function sortByValue(players) {
        const config = MODEL.config();
        let team = MODEL.team();
        let needFactor = {};
        let starters = config.starters;
        for (pos in starters) {
            if (pos === 'flex') continue;
            let startersForPos = starters[pos];
            if (pos === 'rb' || pos === 'wr') {
                startersForPos += starters.flex / 2.0
            }
            let surplus = team[pos].length - startersForPos;
            surplus++;

            if (surplus > 0) {
                let expectedBenchRatio = startersForPos / config.numStarters;
                if(pos === 'k' || pos === 'dst') {
                    expectedBenchRatio = 0;
                }
                const expectedBenchCount = expectedBenchRatio * config.benchSize * 1.75;
                let rawNeed = expectedBenchCount - surplus;
                if(rawNeed < 0) {
                    rawNeed = 0;
                }
                needFactor[pos] = rawNeed / expectedBenchCount
            } else {
                needFactor[pos] = 1
            }
        }

        players.forEach((b) => {
            b.sortFactor = b.pointDif * needFactor[b.pos];
        })

        players.sort(function (a, b) {
            if(b.sortFactor === a.sortFactor) {
                return b.pointDif = a.pointDif;
            }
            return b.sortFactor - a.sortFactor;
        });
    }

    function pad(num, size) {
        var s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }

    function insertPointDif(players, baseline) {
        players.forEach(function (player) {
            player.pointDif = 16 * (player.ppg - baseline.ppg);
            player.pointDif = player.pointDif.toFixed(1);
        });
        players.sort(function (a, b) {
            return b.pointDif - a.pointDif;
        });
        players.forEach(function (player, i) {
            player.posrank = pad(i + 1, 2);
        });
    };

    return {
        init: init,
        draft: draft,
        resetDraft: resetDraft
    };

})();