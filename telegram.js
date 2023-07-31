import tgApi from "node-telegram-bot-api";
import {
  scrapeAuto,
  scrapeFullInfo,
  scrapeModel,
  scrapeNextPage,
} from "./scrappers.js";
import { token } from "./token.js";
import {
  searchParams,
  currYear,
  textStart,
  textChooseCar,
  textChooseModel,
  textSpecificModel,
  textChooseYearFrom,
  textChooseYearTo,
  numberPattern,
  budgetPattern,
  textValidYear,
  textValidBudg,
  textChooseBudgetFrom,
  textChooseBudgetTo,
  textError,
} from "./const.js";

const bot = new tgApi(token, { polling: true });

const brandOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [],
  }),
};
let modelOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [],
  }),
};

const restartOptions = {
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [
        { text: "Пропустити", callback_data: "Пропустити" },
        { text: "Спочатку", callback_data: "Спочатку" },
      ],
    ],
  }),
};

const carsArray = await scrapeAuto("https://auto.ria.com");

carsArray.forEach((item, index) => {
  const replyMarkup = JSON.parse(brandOptions.reply_markup);

  const newItem = { text: item, callback_data: item };

  if (index % 2 === 0) {
    replyMarkup.inline_keyboard.push([newItem]);
  } else {
    const lastIndex = replyMarkup.inline_keyboard.length - 1;
    replyMarkup.inline_keyboard[lastIndex].push(newItem);
  }

  brandOptions.reply_markup = JSON.stringify(replyMarkup);
});

let filter = `\nВаші налаштування:\n`;

let actualContext = "brand";
let lastMessageId;
let lastUserMessageId;
let editStatus = false;
let sentCars = [];
let page = 0;
const autoSearchData = {};
let currBrand;
let currModel;

bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  const msgId = msg.message_id;

  lastUserMessageId = msgId;

  await bot.deleteMessage(chatId, msgId);

  if (text === "/start") {
    await bot.sendMessage(chatId, textStart);
    return bot
      .sendMessage(chatId, textChooseCar, brandOptions)
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      });
  } else if (actualContext === "brand") {
    if (editStatus) return;

    modelOptions = {
      reply_markup: JSON.stringify({
        inline_keyboard: [],
      }),
    };

    searchParams.carBrand = text;
    try {
      const modelsArray = await scrapeModel("https://auto.ria.com/uk/", text);

      modelsArray.forEach((item, index) => {
        const replyMarkup = JSON.parse(modelOptions.reply_markup);

        const newItem = { text: item, callback_data: item };

        if (index % 3 === 0) {
          replyMarkup.inline_keyboard.push([newItem]);
        } else {
          const lastIndex = replyMarkup.inline_keyboard.length - 1;
          replyMarkup.inline_keyboard[lastIndex].push(newItem);
        }

        if (index === modelsArray.length - 1)
          replyMarkup.inline_keyboard.push([
            { text: "Спочатку", callback_data: "Спочатку" },
          ]);

        modelOptions.reply_markup = JSON.stringify(replyMarkup);
      });

      models = modelsArray;

      return bot
        .editMessageText(textChooseModel, {
          chat_id: chatId,
          message_id: lastMessageId,
          reply_markup: modelOptions.reply_markup,
        })
        .then(() => (actualContext = "model"));
    } catch (error) {
      console.error("Error while scraping models:", error.message);
      return bot.sendMessage(chatId, textError);
    }
  } else if (actualContext === "model") {
    if (editStatus) return;

    return bot
      .editMessageText(textSpecificModel, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: modelOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (editStatus = true));
  } else if (
    (actualContext === "budgetFrom" || actualContext === "budgetTo") &&
    !budgetPattern.test(text)
  ) {
    if (editStatus) return;

    return bot
      .editMessageText(filter + textValidBudg, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (editStatus = true));
  } else if (
    (actualContext === "budgetFrom" || actualContext === "budgetTo") &&
    searchParams.carBudgetFrom &&
    +text < +searchParams.carBudgetFrom
  ) {
    if (editStatus) return;

    const textValidB = `Вкажіть валідний бюджет, більший або рівний ${searchParams.carBudgetFrom}`;

    return bot
      .editMessageText(filter + textValidB, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (editStatus = true));
  } else if (actualContext === "budgetFrom" && budgetPattern.test(text)) {
    const budgFrom = text
      .split("")
      .filter((char) => char !== "$")
      .join("");
    searchParams.carBudgetFrom = budgFrom;

    filter += `Бюджет (від): ${searchParams.carBudgetFrom}$ 💵\n\n`;

    return bot
      .editMessageText(filter + textChooseBudgetTo, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "budgetTo"))
      .then(() => (editStatus = false));
  } else if (actualContext === "budgetTo" && budgetPattern.test(text)) {
    const budgTo = text
      .split("")
      .filter((char) => char !== "$")
      .join("");
    searchParams.carBudgetTo = budgTo;

    const info = await scrapeFullInfo("https://auto.ria.com/uk/", searchParams);

    const [fullData, brandId, modelId] = info;

    currBrand = brandId;
    currModel = modelId;

    let filter = `\nВаші налаштування:\n\nМарка: ${searchParams.carBrand} ${searchParams.carModel} 🚘\n`;

    if (searchParams.carYearFrom)
      filter += `\nРік випуску (від): ${searchParams.carYearFrom} ⏳\n`;
    if (searchParams.carYearTo)
      filter += `\nРік випуску (до): ${searchParams.carYearTo} ⌛️\n`;
    if (searchParams.carBudgetFrom)
      filter += `\nБюджет (від): ${searchParams.carBudgetFrom}$ 💵\n`;
    if (searchParams.carBudgetTo)
      filter += `\nБюджет (до): ${searchParams.carBudgetTo}$ 💰\n`;

    if (typeof fullData === "string") {
      return bot
        .editMessageText(fullData + filter, {
          chat_id: chatId,
          message_id: lastMessageId,
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: "Спочатку", callback_data: "Спочатку" }],
            ],
          }),
        })
        .then(() => (actualContext = "finish"))
        .then(() => (editStatus = false));
    }

    await bot.editMessageText(filter + "Спробую знайти варіанти для Вас...", {
      chat_id: chatId,
      message_id: lastMessageId,
      reply_markup: JSON.stringify({
        inline_keyboard: [],
      }),
    });

    for (const data of fullData) {
      let cap = `Марка: ${data.title} \nЦіна: ${data.price} \nПробіг: ${data.details.mileage} \nТип палива: ${data.details.fuel} \nЛокація: ${data.details.location} \nТип КПП: ${data.details.transmission} \nПосилання: ${data.link}\n`;

      if (data.vin) {
        cap += `VIN: ${data.vin} \n\n`;
      }
      if (data.description && data.description.length < 401) {
        cap += `Опис: ${data.description} \n`;
      }

      try {
        const sentMessage = await bot.sendPhoto(
          chatId,
          data.photo ||
            "https://img6.auto.ria.com/images/nophoto/no-photo-295x195.jpg",
          {
            caption: cap,
          }
        );
        sentCars.push(sentMessage.message_id);
      } catch (error) {
        console.error("Error sending car data:", error);
      }
    }

    return bot
      .editMessageText(
        filter + `Варіанти за Вашим фільтром (сторінка ${page})`,
        {
          chat_id: chatId,
          message_id: lastMessageId,
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [
                { text: "Спочатку", callback_data: "Спочатку" },
                { text: "Більше варіантів", callback_data: "Більше варіантів" },
              ],
            ],
          }),
        }
      )
      .then(() => (actualContext = "finish"))
      .then(() => (editStatus = false));
  } else if (
    ((actualContext === "yearFrom" || actualContext === "yearTo") &&
      !numberPattern.test(text)) ||
    +text < 1900 ||
    +text > currYear
  ) {
    if (editStatus) return;

    return bot
      .editMessageText(filter + textValidYear, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (editStatus = true));
  } else if (
    (actualContext === "yearFrom" || actualContext === "yearTo") &&
    text < searchParams.carYearFrom
  ) {
    if (editStatus) return;

    const textValidYearFromTo = `Вкажіть валідний рік, більший або рівний ${searchParams.carYearFrom}`;

    return bot
      .editMessageText(filter + textValidYearFromTo, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (editStatus = true));
  } else if (actualContext === "yearFrom" && numberPattern.test(text)) {
    searchParams.carYearFrom = text;

    filter += `Рік випуску (від): ${searchParams.carYearFrom} ⏳\n\n`;

    return bot
      .editMessageText(filter + textChooseYearTo, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "yearTo"))
      .then(() => (editStatus = false));
  } else if (actualContext === "yearTo" && numberPattern.test(text)) {
    searchParams.carYearTo = text;

    filter += `Рік випуску (до): ${searchParams.carYearTo} ⌛️\n\n`;

    return bot
      .editMessageText(filter + textChooseBudgetFrom, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "budgetFrom"))
      .then(() => (editStatus = false));
  }
});

let models = null;

bot.on("callback_query", async (msg) => {
  const chatId = msg.message.chat.id;
  const messageId = msg.message.message_id;

  if (
    carsArray.findIndex((txt) => txt === msg.data) !== -1 &&
    msg.data !== "Спочатку"
  ) {
    modelOptions = {
      reply_markup: JSON.stringify({
        inline_keyboard: [],
      }),
    };

    searchParams.carBrand = msg.data;
    sentCars = [];

    try {
      const modelsArray = await scrapeModel(
        "https://auto.ria.com/uk/",
        msg.data
      );

      modelsArray.forEach((item, index) => {
        const replyMarkup = JSON.parse(modelOptions.reply_markup);

        const newItem = { text: item, callback_data: item };

        if (index % 3 === 0) {
          replyMarkup.inline_keyboard.push([newItem]);
        } else {
          const lastIndex = replyMarkup.inline_keyboard.length - 1;
          replyMarkup.inline_keyboard[lastIndex].push(newItem);
        }

        if (index === modelsArray.length - 1)
          replyMarkup.inline_keyboard.push([
            { text: "Спочатку", callback_data: "Спочатку" },
          ]);

        modelOptions.reply_markup = JSON.stringify(replyMarkup);
      });

      models = modelsArray;

      filter += `\nМарка: ${searchParams.carBrand} 🚘\n\n`;

      return bot
        .editMessageText(filter + textChooseModel, {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: modelOptions.reply_markup,
        })
        .then(() => (actualContext = "model"));
    } catch (error) {
      console.error("Error while scraping models:", error.message);
      return bot.sendMessage(chatId, textError);
    }
  } else if (msg.data === "Пропустити" && actualContext === "yearFrom") {
    filter += `Рік випуску (від): не вказано ⏳\n\n`;

    return bot
      .editMessageText(filter + textChooseYearTo, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "yearTo"));
  } else if (actualContext === "finish" && msg.data === "Більше варіантів") {
    page += 1;

    if (searchParams.carBudgetTo) {
      filter += `Бюджет (до): ${searchParams.carBudgetTo}$ 💰\n\n`;
    } else {
      filter += `Бюджет (до): не вказано 💰\n\n`;
    }

    let nextCarUrl = `https://auto.ria.com/uk/search/?categories.main.id=1&price.currency=1`;

    if (searchParams.carBudgetFrom)
      nextCarUrl += `&price.USD.gte=${searchParams.carBudgetFrom}`;

    if (searchParams.carBudgetTo)
      nextCarUrl += `&price.USD.lte=${searchParams.carBudgetTo}`;

    nextCarUrl += `&indexName=auto,order_auto,newauto_search&brand.id[0]=${currBrand}&model.id[0]=${currModel}`;

    if (searchParams.carYearFrom)
      nextCarUrl += `&year[0].gte=${searchParams.carYearFrom}`;

    if (searchParams.carBudgetTo)
      nextCarUrl += `&year[0].lte=${searchParams.carBudgetTo}`;

    nextCarUrl += `&page=${page}&size=20`;

    const nextPageInfo = await scrapeNextPage(nextCarUrl);

    const [fullData] = nextPageInfo;

    await bot.editMessageText(filter + "Спробую знайти варіанти для Вас...", {
      chat_id: chatId,
      message_id: lastMessageId,
      reply_markup: JSON.stringify({
        inline_keyboard: [],
      }),
    });

    if (typeof fullData === "string") {
      return bot
        .editMessageText(fullData + filter, {
          chat_id: chatId,
          message_id: lastMessageId,
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: "Спочатку", callback_data: "Спочатку" }],
            ],
          }),
        })
        .then(() => (actualContext = "finish"))
        .then(() => (editStatus = false));
    }

    for (const data of fullData) {
      let cap = `Марка: ${data.title} \nЦіна: ${data.price} \nПробіг: ${data.details.mileage} \nТип палива: ${data.details.fuel} \nЛокація: ${data.details.location} \nТип КПП: ${data.details.transmission} \nПосилання: ${data.link}\n`;

      if (data.vin) {
        cap += `VIN: ${data.vin} \n\n`;
      }
      if (data.description && data.description.length < 401) {
        cap += `Опис: ${data.description} \n`;
      }

      try {
        const sentMessage = await bot.sendPhoto(
          chatId,
          data.photo ||
            "https://img6.auto.ria.com/images/nophoto/no-photo-295x195.jpg",
          {
            caption: cap,
          }
        );
        sentCars.push(sentMessage.message_id);
      } catch (error) {
        console.error("Error sending car data:", error);
      }
    }

    return bot
      .editMessageText(
        filter + `Варіанти за Вашим фільтром (сторінка ${page})`,
        {
          chat_id: chatId,
          message_id: lastMessageId,
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [
                { text: "Спочатку", callback_data: "Спочатку" },
                { text: "Більше варіантів", callback_data: "Більше варіантів" },
              ],
            ],
          }),
        }
      )
      .then(() => (editStatus = false));
  } else if (msg.data === "Пропустити" && actualContext === "yearTo") {
    filter += `Рік випуску (до): не вказано ⏳\n\n`;

    return bot
      .editMessageText(filter + textChooseBudgetFrom, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "budgetFrom"));
  } else if (msg.data === "Пропустити" && actualContext === "budgetFrom") {
    filter += `Бюджет (від): не вказано 💵\n\n`;

    return bot
      .editMessageText(filter + textChooseBudgetTo, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "budgetTo"));
  } else if (msg.data === "Пропустити" && actualContext === "budgetTo") {
    const info = await scrapeFullInfo("https://auto.ria.com/uk/", searchParams);

    const [fullData, brandId, modelId] = info;

    currBrand = brandId;
    currModel = modelId;

    let filter = `\nВаші налаштування:\n\nМарка: ${searchParams.carBrand} ${searchParams.carModel} 🚘\n`;

    if (searchParams.carYearFrom)
      filter += `\nРік випуску (від): ${searchParams.carYearFrom} ⏳\n`;
    if (searchParams.carYearTo)
      filter += `\nРік випуску (до): ${searchParams.carYearTo} ⌛️\n`;
    if (searchParams.carBudgetFrom)
      filter += `\nБюджет (від): ${searchParams.carBudgetFrom}$ 💵\n`;
    if (searchParams.carBudgetTo)
      filter += `\nБюджет (до): ${searchParams.carBudgetTo}$ 💰\n`;

    if (typeof fullData === "string") {
      return bot
        .editMessageText(fullData + filter, {
          chat_id: chatId,
          message_id: lastMessageId,
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: "Спочатку", callback_data: "Спочатку" }],
            ],
          }),
        })
        .then(() => (actualContext = "finish"))
        .then(() => (editStatus = false));
    }

    await bot.editMessageText(filter + "Спробую знайти варіанти для Вас...", {
      chat_id: chatId,
      message_id: lastMessageId,
      reply_markup: JSON.stringify({
        inline_keyboard: [],
      }),
    });

    for (const data of fullData) {
      let cap = `Марка: ${data.title} \nЦіна: ${data.price} \nПробіг: ${data.details.mileage} \nТип палива: ${data.details.fuel} \nЛокація: ${data.details.location} \nТип КПП: ${data.details.transmission} \nПосилання: ${data.link}\n`;

      if (data.vin) {
        cap += `VIN: ${data.vin} \n\n`;
      }
      if (data.description && data.description.length < 401) {
        cap += `Опис: ${data.description} \n`;
      }

      try {
        const sentMessage = await bot.sendPhoto(
          chatId,
          data.photo || "./noPhoto.jpg",
          {
            caption: cap,
          }
        );
        sentCars.push(sentMessage.message_id);
      } catch (error) {
        console.error("Error sending car data:", error);
      }
    }

    return bot
      .editMessageText(
        filter + `Варіанти за Вашим фільтром (сторінка ${page})`,
        {
          chat_id: chatId,
          message_id: lastMessageId,
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [
                { text: "Спочатку", callback_data: "Спочатку" },
                { text: "Більше варіантів", callback_data: "Більше варіантів" },
              ],
            ],
          }),
        }
      )
      .then(() => (actualContext = "finish"))
      .then(() => (editStatus = false));
  } else if (msg.data === "Спочатку") {
    searchParams.carYearFrom = null;
    searchParams.carYearTo = null;
    searchParams.carBudgetFrom = null;
    searchParams.carBudgetTo = null;

    page = 1;

    filter = `\nВаші налаштування:\n`;

    if (sentCars.length) {
      for (let car of sentCars) {
        await bot.deleteMessage(chatId, car);
      }
    }

    return bot
      .editMessageText(textChooseCar, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: brandOptions.reply_markup,
      })
      .then(() => (actualContext = "brand"));
  } else if (models.findIndex((txt) => txt === msg.data) !== -1) {
    searchParams.carModel = msg.data;

    lastMessageId = messageId;

    filter += `Модель: ${searchParams.carModel} 🚘\n\n`;

    return bot
      .editMessageText(filter + textChooseYearFrom, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: restartOptions.reply_markup,
      })
      .then(() => (actualContext = "yearFrom"));
  }
});
