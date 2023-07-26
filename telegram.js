import tgApi from "node-telegram-bot-api";
import { scrapeAuto, scrapeFullInfo, scrapeModel } from "./scrappers.js";

const token = "6141548364:AAFsjvvVosav-H-q7rHGOTl4L97Z_7oeCs8";

const bot = new tgApi(token, { polling: true });

const searchParams = {
  carBrand: null,
  carModel: null,
  carYearFrom: null,
  carYearTo: null,
  carBudgetFrom: null,
  carBudgetTo: null,
};

// let { carBrand, carModel, carYearFrom, carYearTo, carBudgetFrom, carBudgetTo } =
//   searchParams;

// const filter = `\nВаші налаштування:\nМарка: ${carBrand} ${carModel}`

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

const carsArray = await scrapeAuto("https://auto.ria.com/uk/");

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

const currYear = new Date().getFullYear();

const textStart =
  "Welcome to the autoria-parser tool! \n\nDeveloped by Dovban D.\n\nPackages used in app: puppeteer, node-telegram-bot-api";

const textChooseCar = `Оберіть марку для пошуку або введіть свій варіант`;

const textChooseModel = "Оберіть модель для пошуку";

const textSpecificModel =
  "Будь ласка, оберіть модель із запропонованого списку";

const textChooseYearFrom = `Вкажіть рік для пошуку ВІД (1900 - ${currYear}) в чат або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;
const textChooseYearTo = `Вкажіть рік для пошуку ДО (1900 - ${currYear}) в чат або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;

const numberPattern = /^[0-9]+$/;
const budgetPattern = /^[0-9]*\$?$/;

const textValidYear = `Вкажіть валідний рік, від 1900 до ${currYear} або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;
const textValidBudg = `Вкажіть коректний бюджет (> 0)`;

const textChooseBudgetFrom = `Вкажіть бюджет ВІД (цілі числа, $) або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;
const textChooseBudgetTo = `Вкажіть бюджет ДО (цілі числа, $) або натисніть СПОЧАТКУ/ПРОПУСТИТИ`;
const textError =
  "При завантаженні варіантів виникла помилка. Спробуйте ще раз...";

let filter = `\nВаші налаштування:\n`;

let actualContext = "brand";
let lastMessageId;
let lastUserMessageId;
let editStatus = false;
let sentCars = [];

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
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
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
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
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
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
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

    const fullData = await scrapeFullInfo(
      "https://auto.ria.com/uk/",
      searchParams
    );

    if (typeof fullData === "string") {
      let filter = `\nВаші налаштування:\n\nМарка: ${searchParams.carBrand} ${searchParams.carModel} 🚘\n`;

      if (searchParams.carYearFrom)
        filter += `\nРік випуску (від): ${searchParams.carYearFrom} ⏳\n`;
      if (searchParams.carYearTo)
        filter += `\nРік випуску (до): ${searchParams.carYearTo} ⌛️\n`;
      if (searchParams.carBudgetFrom)
        filter += `\nБюджет (від): ${searchParams.carBudgetFrom}$ 💵\n`;
      if (searchParams.carBudgetTo)
        filter += `\nБюджет (до): ${searchParams.carBudgetTo}$ 💰\n`;

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

    filter += `Бюджет (до): ${searchParams.carBudgetTo}$ 💰\n\n`;

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
      .editMessageText(filter + "Наразі це всі варіанти за Вашим фільтром...", {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "Спочатку", callback_data: "Спочатку", disable: false }],
          ],
        }),
      })
      .then(() => (actualContext = "finish"))
      .then(() => (editStatus = false));
  } else if (
    ((actualContext === "yearFrom" || actualContext === "yearTo") &&
      !numberPattern.test(text)) ||
    text < 1900 ||
    text > currYear
  ) {
    if (editStatus) return;

    return bot
      .editMessageText(filter + textValidYear, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
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
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
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
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
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
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
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
  // console.log(msg);

  const chatId = msg.message.chat.id;
  const messageId = msg.message.message_id;

  // console.log(msg.message.text);

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
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "yearTo"));
  } else if (msg.data === "Пропустити" && actualContext === "yearTo") {
    filter += `Рік випуску (до): не вказано ⏳\n\n`;

    return bot
      .editMessageText(filter + textChooseBudgetFrom, {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
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
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
      })
      .then((sentMessage) => {
        lastMessageId = sentMessage.message_id;
      })
      .then(() => (actualContext = "budgetTo"));
  } else if (msg.data === "Пропустити" && actualContext === "budgetTo") {
    const fullData = await scrapeFullInfo(
      "https://auto.ria.com/uk/",
      searchParams
    );

    if (typeof fullData === "string") {
      let filter = `\nВаші налаштування:\n\nМарка: ${searchParams.carBrand} ${searchParams.carModel} 🚘\n`;

      if (searchParams.carYearFrom)
        filter += `\nРік випуску (від): ${searchParams.carYearFrom} ⏳\n`;
      if (searchParams.carYearTo)
        filter += `\nРік випуску (до): ${searchParams.carYearTo} ⌛️\n`;
      if (searchParams.carBudgetFrom)
        filter += `\nБюджет (від): ${searchParams.carBudgetFrom}$ 💵\n`;
      if (searchParams.carBudgetTo)
        filter += `\nБюджет (до): ${searchParams.carBudgetTo}$ 💰\n`;

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

    filter += `Бюджет (до): не вказано 💰\n\n`;

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
      .editMessageText(filter + "Наразі це всі варіанти за Вашим фільтром...", {
        chat_id: chatId,
        message_id: lastMessageId,
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "Спочатку", callback_data: "Спочатку", disable: false }],
          ],
        }),
      })
      .then(() => (actualContext = "finish"))
      .then(() => (editStatus = false));
  } else if (msg.data === "Спочатку") {
    searchParams.carYearFrom = null;
    searchParams.carYearTo = null;
    searchParams.carBudgetFrom = null;
    searchParams.carBudgetTo = null;

    filter = `\nВаші налаштування:\n`;

    for (let car of sentCars) {
      await bot.deleteMessage(chatId, car);
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
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              { text: "Пропустити", callback_data: "Пропустити" },
              { text: "Спочатку", callback_data: "Спочатку" },
            ],
          ],
        }),
      })
      .then(() => (actualContext = "yearFrom"));
  }
});
