Update the scraping logic to become a scrapy spider. We only need to be able to run it locally.

I have uv installed, but we'll probably need to use a virtual environment and add python versions.

The goal is to scrape these pages to get projections data for the value over replacement calculations
- https://www.fantasypros.com/nfl/projections/qb.php?week=draft
- https://www.fantasypros.com/nfl/projections/rb.php?week=draft&scoring=PPR&week=draft
- https://www.fantasypros.com/nfl/projections/wr.php?week=draft&scoring=PPR&week=draft
- https://www.fantasypros.com/nfl/projections/te.php?week=draft&scoring=PPR&week=draft
- https://www.fantasypros.com/nfl/projections/k.php?week=draft
- https://www.fantasypros.com/nfl/projections/dst.php?week=draft

We'll also want to get expert rankings and tier breaks from these pages
- https://www.fantasypros.com/nfl/rankings/qb-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/ppr-rb-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/ppr-wr-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/ppr-te-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/k-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/dst-cheatsheets.php
