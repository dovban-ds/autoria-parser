import puppeteer from "puppeteer";

export async function scrapeAuto(url) {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  await page.goto(url);

  // const [el] = await page.$x(
  //   '//*[@id="photosBlock"]/div[1]/div[1]/div[1]/picture/img'
  // );

  // const src = await el.getProperty("src");

  // const srcTxt = await src.jsonValue();

  // console.log({ srcTxt });

  const list = await page.$$("#brandTooltipBrandAutocomplete-brand > ul > li");

  const texts = [];

  for (const li of list) {
    const txt = await li.getProperty("textContent");
    const rawTxt = await txt.jsonValue();

    if (rawTxt !== "ТОП марки" && rawTxt !== "Усі марки") {
      if (texts.length < 20) texts.push(rawTxt);
    }
  }

  // console.log(texts);

  browser.close();

  return texts;
}

// scrapeAuto("https://auto.ria.com/uk/");