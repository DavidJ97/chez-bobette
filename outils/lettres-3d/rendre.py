import asyncio, base64, sys
from playwright.async_api import async_playwright
L=[("C","#209de4",.25,.05),("H","#ed131a",-.2,-.04),("E","#f1b009",.18,.03),("Z","#2bc83c",-.22,-.05),
   ("B","#f0141e",.2,.04),("O","#f1b10b",-.18,-.03),("B","#1d9ce5",.22,.05),("E","#e41a27",-.2,-.04),("T","#218ed9",.18,.03),("T","#21ad3b",-.2,-.05),("E","#e6a80d",.22,.04)]
OUT=sys.argv[1]
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg=await b.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:8100/rendu.html?w=600&h=800'); await pg.wait_for_function('window.pret',timeout=20000)
        for i,(l,c,y,r) in enumerate(L):
            d=await pg.evaluate(f"rendre('{l}','{c}',{y},{r})")
            open(f'{OUT}/l{i:02d}.png','wb').write(base64.b64decode(d.split(',')[1]))
        print('erreurs',errs[:3]); await b.close()
asyncio.run(main())
