var MODEL = (function() {

    let config = {};
    let players;
    let projections = {};
    let team = {};
    let drafted = [];

    function init() {
        const savedConfig = localStorage.getItem('config');
        if(savedConfig) {
            config = savedConfig;
        } else {
            config.numTeams = 10;
            config.starters = {
                qb:1.0,
                rb:2.0,
                wr:2.0,
                te:1.0,
                flex:1.0,
                dst:1.0,
                k:1.0
            };
            config.benchSize = 7;
            config.numStarters = config.starters.qb + config.starters.rb + config.starters.wr + config.starters.te + config.starters.flex + config.starters.dst + config.starters.k;
            config.rosterSize = config.numStarters + config.benchSize;
            config.scoring = 'standard';
        }

        players = loadPlayers();
        projections = loadProjections();

        players.forEach(player => {
          if (player.pos === 'dst') {
            var pl = projections[player.pos].find(p => p.name.substring(0,6) == player.name.substring(0,6));
            if (pl) {
              Object.assign(pl, player);
            }
          } else {
            var pl = projections[player.pos].find(p => p.name == player.name);
            if (pl) {
              Object.assign(pl, player);
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
        for(pos in config.starters) {
            if(pos === 'flex') continue;
            team[pos] = [];
        }
    }

    return {
        config: () => {return config;},
        players: () => {return players;},
        projections: () => {return projections;},
        team: () => {return team;},
        init:init
    }
})();