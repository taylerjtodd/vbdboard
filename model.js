var MODEL = (function () {

    let config = {};
    let players;
    let projections = {};
    let team = {};
    let draftedPlayers;

    function init() {
        config = loadConfig();

        players = loadPlayers();
        projections = loadProjections();
        initDraftedPlayers();

        players.forEach(player => {
            if (player.pos === 'dst') {
                let pl = projections[player.pos].find(p => p.name.substring(0, 6) === player.name.substring(0, 6));
                if (pl) {
                    Object.assign(pl, player);
                    draftedPlayers.forEach((draftedPlayer, i) => {
                        if (draftedPlayer.pos === player.pos && draftedPlayer.name.substring(0, 6) === player.name.substring(0, 6)) {
                            pl.drafted = i+1;
                        }
                    });
                }
            } else {
                let pl = projections[player.pos].find(p => p.name == player.name);
                if (pl) {
                    Object.assign(pl, player);
                    draftedPlayers.forEach((draftedPlayer, i) => {
                        if (draftedPlayer.pos === player.pos && draftedPlayer.name === player.name) {
                            pl.drafted = i+1;
                        }
                    });
                }

            }
        });

        players = projections.qb.concat(projections.rb, projections.wr, projections.te, projections.dst, projections.k);

        initTeam();

    }

    function loadConfig() {
        const savedConfig = localStorage.getItem('config');
        if (savedConfig) {
            config = JSON.parse(savedConfig);
        }
        else {
            config.numTeams = 10;
            config.starters = {
                qb: 1.0,
                rb: 2.0,
                wr: 2.0,
                te: 1.0,
                flex: 1.0,
                dst: 1.0,
                k: 1.0
            };
            config.benchSize = 7;
            config.numStarters = config.starters.qb + config.starters.rb + config.starters.wr + config.starters.te + config.starters.flex + config.starters.dst + config.starters.k;
            config.rosterSize = config.numStarters + config.benchSize;
            config.scoring = 'standard';
            config.baselineRangeStart = 50;
            config.baselineRangeEnd = 170;

            config.buffPercentages = {
                qb: 1.0,
                rb: 1.0,
                wr: 1.0,
                te: 1.0,
                flex: 1.0,
                dst: 1.0,
                k: 1.0
            }
        }
        return config;
    }
    
    function loadPlayers() {
        return DataLoad.ranks();
    }

    function loadProjections() {
        return DataLoad.projections();
    }

    function initTeam() {
        let storedValue = localStorage.getItem('team');
        if (storedValue) {
            team = JSON.parse(storedValue);
        } else {
            for (pos in config.starters) {
                if (pos === 'flex') continue;
                team[pos] = [];
            }
        }
    }

    function initDraftedPlayers() {
        let storedValue = localStorage.getItem('draftedPlayers');
        if (storedValue) {
            draftedPlayers = JSON.parse(storedValue);
        } else draftedPlayers = [];
    }

    function drafted(player, myTeam) {
        if (player) {
            draftedPlayers.push(player);
            localStorage.setItem('draftedPlayers', JSON.stringify(draftedPlayers));

            if (myTeam) {
                team[player.pos].push(player);
                localStorage.setItem('team', JSON.stringify(team));
            }
        } else {
            return draftedPlayers;
        }
    }

    function updateDraftPosition(draftPosition, direction) {
        
        let index = draftPosition - 1;
        let swapIndex = index + direction;

        if(swapIndex < 0 || swapIndex >= draftedPlayers.length) {
            return;
        }

        let player = draftedPlayers[index];
        let swapPlayer = draftedPlayers[swapIndex];
        draftedPlayers[index] = swapPlayer;
        draftedPlayers[swapIndex] = player;
        localStorage.setItem('draftedPlayers', JSON.stringify(draftedPlayers));
    }

    function resetDraft() {
        localStorage.removeItem('draftedPlayers');
        localStorage.removeItem('team');
    }

    function resetConfig() {
        localStorage.removeItem('config');
    }

    function buff(pos) {
        config.buffPercentages[pos] += 0.1;
        localStorage.setItem('config', JSON.stringify(config));
    }

    function nerf(pos) {
        config.buffPercentages[pos] -= 0.1;
        if(config.buffPercentages[pos] < 0) {
            config.buffPercentages[pos] = 0.0;
        }
        localStorage.setItem('config', JSON.stringify(config));
    }

    function updateBaselines(start, end) {
        config.baselineRangeStart = Number(start);
        config.baselineRangeEnd = Number(end);
        if(config.baselineRangeStart < config.numTeams) {
            config.baselineRangeStart = config.numTeams;
        }
        if(config.baselineRangeEnd < config.numTeams * config.rosterSize) {
            config.baselineRangeEnd = config.numTeams * config.rosterSize;
        }

        localStorage.setItem('config', JSON.stringify(config));
    }

    return {
        config: () => { return config; },
        players: () => { return players; },
        projections: () => { return projections; },
        team: () => { return team; },
        drafted: drafted,
        updateDraftPosition: updateDraftPosition,
        resetDraft: resetDraft,
        resetConfig: resetConfig,
        buff: buff,
        nerf: nerf,
        updateBaselines : updateBaselines ,
        init: init,
    }
})();
