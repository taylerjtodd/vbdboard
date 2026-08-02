# Real Scrape Specification

Update the scraping logic to become a scrapy spider. We only need to be able to run it locally.

I have uv installed, but we'll probably need to use a virtual environment and add python versions.

The goal is to scrape these pages to get projections data for the value over replacement calculations:
- https://www.fantasypros.com/nfl/projections/qb.php?week=draft
- https://www.fantasypros.com/nfl/projections/rb.php?week=draft&scoring=PPR&week=draft
- https://www.fantasypros.com/nfl/projections/wr.php?week=draft&scoring=PPR&week=draft
- https://www.fantasypros.com/nfl/projections/te.php?week=draft&scoring=PPR&week=draft
- https://www.fantasypros.com/nfl/projections/k.php?week=draft
- https://www.fantasypros.com/nfl/projections/dst.php?week=draft

We'll also want to get expert rankings and tier breaks from these pages:
- https://www.fantasypros.com/nfl/rankings/qb-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/ppr-rb-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/ppr-wr-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/ppr-te-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/k-cheatsheets.php
- https://www.fantasypros.com/nfl/rankings/dst-cheatsheets.php

---

## Implementation Plan

### 1. Environment Setup
- Create a directoy in the root of the project called `fp_scraper` to hold the python code.
- Use `uv` to create a new virtual environment inside `fp_scraper` : `uv venv`
- Activate the virtual environment.
- Install dependencies via `uv pip install scrapy`.
- Create a `requirements.txt` to track `scrapy` and any other required libraries (e.g., `pytest` if we want tests).
- Initialize the Scrapy project using `scrapy startproject fp_scraper`.

### 2. Spider Generation
We will create a Scrapy spider (e.g., `fantasypros_spider.py`) with two primary scraping functions.

#### A. Projections Scraper
- Target URLs: The projections links listed above.
- Data to Extract:
  - `name`: Player name
  - `position`: Deduced from the URL or table context.
  - `points`: Total projected points.
  - `ppg`: Points per game (calculated from points or scraped if explicitly listed).
  - `tier`: Defaulted to `0`.
- Logic: Identify the correct CSS selector for the data table (previously `$('table').find('tr')` in `scrape.js`), iterate over the rows up to the required position length (e.g., QB: 25, RB: 75), and yield items.

#### B. Rankings Scraper
- Target URLs: The expert ranking cheatsheets listed above.
- Data to Extract:
  - `name`: Player name
  - `pos`: Position
  - `rank`: Expert consensus rank
  - `adp`: Average Draft Position
  - `tier`: Current tier context
- Logic: Iterate through the table (`#ranking-table`). Detect when a row is a "Tier" separator to update the current `tier` state. Yield items for each player row containing their details and current tier.

### 3. Data Pipeline & Export
- Configure a Scrapy Item Pipeline to process and clean the scraped items (e.g., removing quotes from names, formatting numerical values).
- Configure feed exports in `settings.py` to output the results as `.json` files in a `data/` directory (e.g., `data/projections.json` and `data/ranks.json`).
- We will not overwrite `DataLoad.js`. Instead, the frontend can be updated in a subsequent step to load the raw `.json` files.

### 4. Verification Plan
- Run the Scrapy spiders locally: `scrapy crawl fantasypros`.
- Verify the exported data file matches the structure and length expected by `model.js` and `app.js`.
- Test the frontend locally to ensure data loads properly and the app calculates Value Based Drafting correctly using the newly scraped data.
