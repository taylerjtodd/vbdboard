# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
from itemadapter import ItemAdapter


class FpScraperPipeline:
    def __init__(self):
        self.projections = []
        self.rankings = []

    def process_item(self, item, spider):
        # clean names
        if 'name' in item:
            item['name'] = item['name'].replace('"', '').strip()

        if item.get('type') == 'projection':
            self.projections.append(item)
        elif item.get('type') == 'ranking':
            self.rankings.append(item)
        return item

    def close_spider(self, spider):
        import json
        import os
        
        # Create data dir in the root workspace
        data_dir = os.path.join(spider.settings.get('PROJECT_ROOT', '../data'))
        os.makedirs(data_dir, exist_ok=True)
        
        with open(os.path.join(data_dir, 'projections.json'), 'w') as f:
            json.dump(self.projections, f, indent=2)
            
        with open(os.path.join(data_dir, 'ranks.json'), 'w') as f:
            json.dump(self.rankings, f, indent=2)
