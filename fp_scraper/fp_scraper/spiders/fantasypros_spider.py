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
        
        # Rankings URL — overall PPR cheatsheet gives overall rank + pos_rank in one request
        rankings = [
            'https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php',
        ]

        # ADP URL
        adp_url = 'https://www.fantasypros.com/nfl/adp/ppr-overall.php'

        for url in projections:
            yield scrapy.Request(url=url, cookies=cookies, callback=self.parse_projections)
            
        for url in rankings:
            yield scrapy.Request(url=url, cookies=cookies, callback=self.parse_rankings)

        yield scrapy.Request(url=adp_url, cookies=cookies, callback=self.parse_adp)

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
                        # rank_ecr is overall rank on the overall cheatsheet
                        # pos_rank is the positional rank (e.g. RB5)
                        pos_rank_raw = player.get('pos_rank', '') or ''
                        # pos_rank is like "RB5" or "WR12" — extract the numeric part
                        pos_rank_match = re.search(r'(\d+)$', str(pos_rank_raw))
                        pos_rank = pos_rank_match.group(1) if pos_rank_match else '0'
                        yield {
                            'type': 'ranking',
                            'name': player.get('player_name', ''),
                            'pos': player.get('player_position_id', ''),
                            'rank': pos_rank,
                            'overall_rank': str(player.get('rank_ecr', 0)),
                            'adp': str(player.get('adp', 0) or 0),
                            'tier': player.get('tier', 0)
                        }
                except Exception as e:
                    self.logger.error(f"Failed to parse ecrData: {e}")

    def parse_adp(self, response):
        import json

        script_text = response.xpath(
            '//script[contains(text(), "FP.reportConfig")]/text()'
        ).get()
        if not script_text:
            self.logger.error("parse_adp: could not find FP.reportConfig script block")
            return

        match = re.search(r'window\.FP\.reportConfig\s*=\s*({.*?});\s*$', script_text, re.DOTALL | re.MULTILINE)
        if not match:
            match = re.search(r'FP\.reportConfig\s*=\s*({.*});', script_text, re.DOTALL)

        if not match:
            self.logger.error("parse_adp: regex did not match FP.reportConfig")
            return

        try:
            data = json.loads(match.group(1))
            rows = data.get('table', {}).get('rows', [])
            for row in rows:
                player = row.get('player', {})
                name = player.get('name', '')
                if not name:
                    continue
                pos_raw = row.get('pos', '')
                # pos_raw is like "RB1", "WR3" — strip trailing digits
                pos = re.sub(r'\d+$', '', pos_raw).upper()
                # src_4350 is the Sleeper ADP column
                sleeper_adp = row.get('src_4350')
                yield {
                    'type': 'adp',
                    'name': name.strip(),
                    'pos': pos,
                    'sleeper_adp': float(sleeper_adp) if sleeper_adp is not None else 0.0,
                }
        except Exception as e:
            self.logger.error(f"Failed to parse FP.reportConfig: {e}")
