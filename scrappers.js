import puppeteer from "puppeteer";

export async function scrapeAuto(url) {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  await page.goto(url);

  const list = await page.$$("#brandTooltipBrandAutocomplete-brand > ul > li");

  const texts = [];

  for (const li of list) {
    const txt = await li.getProperty("textContent");
    const rawTxt = await txt.jsonValue();

    if (rawTxt !== "ТОП марки" && rawTxt !== "Усі марки") {
      if (texts.length < 20) texts.push(rawTxt);
    }
  }

  browser.close();

  return texts;
}

export async function scrapeModel(url, brand) {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  await page.goto(url);

  await page.type("#brandTooltipBrandAutocompleteInput-brand", brand, {
    delay: 100,
  });

  await page.click("#brandTooltipBrandAutocomplete-brand > ul > li > a");

  await page.waitForSelector(
    "#brandTooltipBrandAutocomplete-model > ul > li:nth-child(2)"
  );

  const list = await page.$$("#brandTooltipBrandAutocomplete-model > ul > li");

  const texts = [];

  for (const li of list) {
    const txt = await li.getProperty("textContent");
    const rawTxt = await txt.jsonValue();

    if (rawTxt !== "ТОП моделі" && rawTxt !== "Усі моделі") {
      texts.push(rawTxt);
    }
  }

  browser.close();

  return texts;
}

export async function scrapeFullInfo(url, searchParams) {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();

  await page.goto(url);

  await page.type(
    "#brandTooltipBrandAutocompleteInput-brand",
    searchParams.carBrand,
    { delay: 100 }
  );

  await page.click("#brandTooltipBrandAutocomplete-brand > ul > li > a");

  await page.waitForSelector(
    "#brandTooltipBrandAutocomplete-model > ul > li:nth-child(2)"
  );

  await page.type(
    "#brandTooltipBrandAutocompleteInput-model",
    searchParams.carModel,
    { delay: 100 }
  );

  await page.click(
    "#brandTooltipBrandAutocomplete-model > ul > li:nth-child(1) > a"
  );

  // console.log(searchParams);

  if (searchParams.carYearFrom) {
    await page.click(
      "#mainSearchForm > div.wrapper > div.item-column.secondary-column > div:nth-child(2) > div > div"
    );

    await page.type("#yearFrom", searchParams.carYearFrom, { delay: 100 });

    await page.keyboard.press("Enter");

    await page.click(
      "#mainSearchForm > div.wrapper > div.item-column.secondary-column > div:nth-child(2) > div > div"
    );
  }

  if (searchParams.carYearTo) {
    await page.click(
      "#mainSearchForm > div.wrapper > div.item-column.secondary-column > div:nth-child(2) > div > div"
    );

    await page.type("#yearTo", searchParams.carYearTo, { delay: 100 });

    await page.keyboard.press("Enter");

    await page.click(
      "#mainSearchForm > div.wrapper > div.item-column.secondary-column > div:nth-child(2) > div > div"
    );
  }

  if (searchParams.carBudgetFrom) {
    await page.click(
      "#mainSearchForm > div.wrapper > div.item-column.secondary-column > div:nth-child(3) > div > div"
    );

    await page.type("#priceFrom", searchParams.carBudgetFrom, { delay: 100 });

    await page.click("#mainSearchForm > div.wrapper");
  }

  if (searchParams.carBudgetTo) {
    await page.click(
      "#mainSearchForm > div.wrapper > div.item-column.secondary-column > div:nth-child(3) > div > div"
    );

    await page.type("#priceTo", searchParams.carBudgetTo, { delay: 100 });

    await page.click("#mainSearchForm > div.wrapper");
  }

  await Promise.all([
    page.waitForNavigation(),
    page.click("#mainSearchForm > div.footer-form > button"),
  ]);

  await page.click("#paginationChangeSize");
  await page.click("#paginationSizeOptions > a:nth-child(2)");

  await page.waitForXPath('//*[@id="wrapperFooter"]/div[1]/div');

  const fullData = await page.evaluate(() => {
    const carsBlocks = Array.from(document.querySelectorAll(".content-bar"));

    const data = carsBlocks.map((car) => ({
      title: car.querySelector(".content .head-ticket .item a ").innerText,
      price: car.querySelector(".content .price-ticket span").innerText,
      photo: car
        .querySelector(".ticket-photo a picture source")
        ?.getAttribute("srcset"),
      details: {
        mileage: car.querySelector(".content .definition-data ul .js-race")
          .innerText,
        fuel: car.querySelector(".content .definition-data ul li:nth-child(3)")
          .innerText,
        location: car.querySelector(".content .definition-data ul .js-location")
          .innerText,
        transmission: car.querySelector(
          ".content .definition-data ul li:nth-child(4)"
        ).innerText,
      },
      vin: car.querySelector(
        ".content .definition-data .base_information .label-vin"
      )?.innerText,
      reg: car.querySelector(
        ".content .definition-data .base-information .state-num"
      )?.innerText,
      description: car.querySelector(".content .definition-data p").innerText,
      link: car
        .querySelector(".content .head-ticket .item a")
        .getAttribute("href"),
    }));
    return data;
  });

  browser.close();

  // console.log(fullData);

  return fullData;
}
