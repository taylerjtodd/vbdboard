var APPLICATION = (function() {

    function init() {
        $('#body').html('Hello World');
        MODEL.init();

        
        let players = MODEL.players();

        players.sort((a, b) => a.adp - b.adp);

        baselines = {
            qb: determineBaseline("qb", players)
        };

    }

    function determineBaseline(pos, players) {

        let starters = MODEL.config().starters;

        let replacementThreshold = starters.qb + starters.rb + starters.wr + starters.te + starters.flex + starters.dst + starters.k
        replacementThreshold *=  MODEL.config().numTeams;

        for(player in players) {
            if(player.adp > replacementThreshold && player.pos === pos) {
                console.log(player);
                return player;
            }
        }

    }

    return {
        init:init
    };

})();