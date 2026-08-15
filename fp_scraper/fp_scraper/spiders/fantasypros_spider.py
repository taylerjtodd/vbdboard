import scrapy
import re

class FantasyProsSpider(scrapy.Spider):
    name = "fantasypros"

    def start_requests(self):
        import os
        import json

        # Load cookies from the JSON file provided by the user
        cookies = {}
        cookies_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'www.fantasypros.com_cookies.json'
        )
        if os.path.exists(cookies_path):
            try:
                with open(cookies_path, 'r') as f:
                    cookies_list = json.load(f)
                    cookies = {c['name']: c['value'] for c in cookies_list}
                self.logger.info(f"Successfully loaded {len(cookies)} cookies from {cookies_path}")
            except Exception as e:
                self.logger.error(f"Failed to load cookies from {cookies_path}: {e}")
        else:
            self.logger.warning(f"Cookies file not found at {cookies_path}")

        # Projections URLs
        projections = [
            'https://www.fantasypros.com/nfl/projections/qb.php?week=draft',
            'https://www.fantasypros.com/nfl/projections/rb.php?week=draft&scoring=PPR',
            'https://www.fantasypros.com/nfl/projections/wr.php?week=draft&scoring=PPR',
            'https://www.fantasypros.com/nfl/projections/te.php?week=draft&scoring=PPR',
            'https://www.fantasypros.com/nfl/projections/k.php?week=draft',
            'https://www.fantasypros.com/nfl/projections/dst.php?week=draft',
        ]
        
        # Rankings URLs
        rankings = [
            'https://www.fantasypros.com/nfl/rankings/qb-cheatsheets.php',
            'https://www.fantasypros.com/nfl/rankings/ppr-rb-cheatsheets.php',
            'https://www.fantasypros.com/nfl/rankings/ppr-wr-cheatsheets.php',
            'https://www.fantasypros.com/nfl/rankings/ppr-te-cheatsheets.php',
            'https://www.fantasypros.com/nfl/rankings/k-cheatsheets.php',
            'https://www.fantasypros.com/nfl/rankings/dst-cheatsheets.php',
        ]

        for url in projections:
            yield scrapy.Request(url=url, cookies=cookies, callback=self.parse_projections)
            
        for url in rankings:
            yield scrapy.Request(url=url, cookies=cookies, callback=self.parse_rankings)

    def parse_projections(self, response):
        position = re.search(r'/projections/([a-z]+)\.php', response.url).group(1).upper()
        
        rows = response.css('table#data tbody tr')
        if not rows:
            rows = response.css('table tbody tr') # fallback

        limit = 75 if position in ['RB', 'WR'] else (40 if position == 'TE' else 35)

        for i, row in enumerate(rows):
            if i >= limit:
                break
                
            name = row.css('td:nth-child(1) a.player-name::text').get()
            if not name:
                name = row.css('td:nth-child(1) a::text').get()
            if not name:
                continue

            # usually the last td is total points
            points = row.css('td:last-child::text').get()
            
            yield {
                'type': 'projection',
                'name': name.strip(),
                'position': position,
                'points': points.strip() if points else "0",
                'ppg': "0",
                'tier': 0
            }

    def parse_rankings(self, response):
        import json
        
        script_text = response.xpath('//script[contains(text(), "var ecrData")]/text()').get()
        if script_text:
            match = re.search(r'var ecrData = ({.*?});\n', script_text, re.DOTALL)
            if not match:
                match = re.search(r'var ecrData = ({.*});', script_text)
                
            if match:
                try:
                    data = json.loads(match.group(1))
                    players = data.get('players', [])
                    for player in players:
                        yield {
                            'type': 'ranking',
                            'name': player.get('player_name', ''),
                            'pos': player.get('player_position_id', ''),
                            'rank': str(player.get('rank_ecr', 0)),
                            'adp': str(player.get('adp', 0) or 0),
                            'tier': player.get('tier', 0)
                        }
                except Exception as e:
                    self.logger.error(f"Failed to parse ecrData: {e}")
