var MODEL = (function () {

    let config = {};
    let players;
    let projections = {};
    let team = {};
    let draftedPlayers;

    function init() {
        const savedConfig = localStorage.getItem('config');
        if (savedConfig) {
            config = JSON.parse(savedConfig);
        } else {
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
        }

        players = loadPlayers();
        projections = loadProjections();
        initDraftedPlayers();

        players.forEach(player => {
            if (player.pos === 'dst') {
                let pl = projections[player.pos].find(p => p.name.substring(0, 6) === player.name.substring(0, 6));
                if (pl) {
                    Object.assign(pl, player);
                    draftedPlayers.forEach((draftedPlayer) => {
                        if (draftedPlayer.pos === player.pos && draftedPlayer.name.subString(0, 6) === player.name.substring(0, 6)) {
                            pl.drafted = true;
                        }
                    });
                }
            } else {
                let pl = projections[player.pos].find(p => p.name == player.name);
                if (pl) {
                    Object.assign(pl, player);
                    draftedPlayers.forEach((draftedPlayer) => {
                        if (draftedPlayer.pos === player.pos && draftedPlayer.name === player.name) {
                            pl.drafted = true;
                        }
                    });
                }

            }
        });

        players = projections.qb.concat(projections.rb, projections.wr, projections.te, projections.dst, projections.k);

        initTeam();

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

    function resetDraft() {
        localStorage.removeItem('draftedPlayers');
        localStorage.removeItem('team');
    }

    return {
        config: () => { return config; },
        players: () => { return players; },
        projections: () => { return projections; },
        team: () => { return team; },
        drafted: drafted,
        resetDraft: resetDraft,
        init: init
    }
})();