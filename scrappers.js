import puppeteer from "puppeteer";

export async function scrapeAuto(url) {
  const browser = await puppeteer.launch({
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

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
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

  await page.type("#brandTooltipBrandAutocompleteInput-brand", brand, {
    delay: 100,
  });

  if (brand === "Volkswagen") {
    await page.waitForSelector(
      "#brandTooltipBrandAutocomplete-brand > ul > li:nth-child(2) > a"
    );
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
  } else {
    await page.waitForSelector(
      "#brandTooltipBrandAutocomplete-brand > ul > li > a"
    );

    await page.click("#brandTooltipBrandAutocomplete-brand > ul > li > a");
  }

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

  await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

  await page.type(
    "#brandTooltipBrandAutocompleteInput-brand",
    searchParams.carBrand,
    { delay: 100 }
  );

  let brandId;

  if (searchParams.carBrand === "Volkswagen") {
    await page.waitForSelector(
      "#brandTooltipBrandAutocomplete-brand > ul > li:nth-child(2) > a"
    );

    let id = await page.$(
      "#brandTooltipBrandAutocomplete-brand > ul > li:nth-child(2) > a"
    );

    brandId = await id.evaluate((el) => el.getAttribute("data-value"));

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
  } else {
    await page.waitForSelector(
      "#brandTooltipBrandAutocomplete-brand > ul > li > a"
    );

    let id = await page.$("#brandTooltipBrandAutocomplete-brand > ul > li > a");

    brandId = await id.evaluate((el) => el.getAttribute("data-value"));

    await page.click("#brandTooltipBrandAutocomplete-brand > ul > li > a");
  }

  await page.waitForSelector(
    "#brandTooltipBrandAutocomplete-model > ul > li:nth-child(2)"
  );

  await page.type(
    "#brandTooltipBrandAutocompleteInput-model",
    searchParams.carModel,
    { delay: 100 }
  );

  await page.waitForSelector(
    "#brandTooltipBrandAutocomplete-model > ul > li:nth-child(1) > a"
  );

  let id = await page.$(
    "#brandTooltipBrandAutocomplete-model > ul > li:nth-child(1) > a"
  );

  const modelId = await id.evaluate((el) => el.getAttribute("data-value"));

  await page.click(
    "#brandTooltipBrandAutocomplete-model > ul > li:nth-child(1) > a"
  );

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

  const check = await page.waitForSelector("#paginationChangeSize", {
    timeout: 3000,
  });

  if (!check) {
    await page.click("#paginationChangeSize");
    await page.click("#paginationSizeOptions > a:nth-child(2)");
  }

  await page.waitForXPath('//*[@id="wrapperFooter"]/div[1]/div');

  const fullData = await page.evaluate(() => {
    const carsBlocks = Array.from(document.querySelectorAll(".content-bar"));

    if (!carsBlocks.length)
      return "На жаль, зараз немає варіантів за обраним фільтром, спробуйте ще раз...\n";

    const data = carsBlocks.map((car) => ({
      title: car.querySelector(".content .head-ticket .item a ")?.innerText,
      price: car.querySelector(".content .price-ticket span")?.innerText,
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

  return [fullData, brandId, modelId];
}

export async function scrapeNextPage(url) {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });

    await page.waitForXPath('//*[@id="wrapperFooter"]/div/div');

    const fullData = await page.evaluate(() => {
      const carsBlocks = Array.from(document.querySelectorAll(".content-bar"));

      if (!carsBlocks.length)
        return "Наразі це всі варіанти за обраним фільтром...\n";

      const data = carsBlocks.map((car) => ({
        title: car.querySelector(".content .head-ticket .item a ").innerText,
        price: car.querySelector(".content .price-ticket span").innerText,
        photo: car
          .querySelector(".ticket-photo a picture source")
          ?.getAttribute("srcset"),
        details: {
          mileage: car.querySelector(".content .definition-data ul .js-race")
            .innerText,
          fuel: car.querySelector(
            ".content .definition-data ul li:nth-child(3)"
          ).innerText,
          location: car.querySelector(
            ".content .definition-data ul .js-location"
          ).innerText,
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

    return [fullData];
  } catch (error) {
    console.error("Помилка при опрацюванні наступної сторінки:", error);
    return `Помилка при опрацюванні наступної сторінки:${error}`;
  } finally {
    await browser.close();
  }
}
