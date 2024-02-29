import mwclient
import mwclient.page
from pathlib import Path

site = mwclient.Site("isaac.huijiwiki.com", clients_useragent="Frto027/entity_json_upload.py")

with open("D:/pswd.txt","r") as f:
    site.login('Frto027的机器人',f.read())

wikitexts = Path("wikitexts")

# for templatefile in wikitexts.glob("*.wikitext"):
for templatefile in wikitexts.glob("*.wikitext"):
    idstr = templatefile.name[:-len(".wikitext")]
    print(templatefile.name, idstr)
    pagename = f"模板:实体动画/{idstr}"
    with templatefile.open("r",encoding="utf8") as f:
        pagetext = f.read()
    print(pagename)
    page:mwclient.page.Page = site.Pages[pagename]
    page.save(pagetext, summary="更新实体动画")
